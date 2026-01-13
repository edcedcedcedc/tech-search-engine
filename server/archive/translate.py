from django.core.management.base import BaseCommand
from products.models import Product
from products.utils.translation_log import translation_log
import time
import environ
from openai import OpenAI
import json
import signal
from django.db import transaction
import re  # Added for JSON extraction

# Load environment variables and initialize OpenAI client
env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


class Command(BaseCommand):
    help = "Translate products using Google Translate: RO->EN and EN->RU"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            default="default",
            help="Database alias to use (from settings.py DATABASES)",
        )
        parser.add_argument(
            "--sleep", type=float, default=0.5, help="Sleep between translations"
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force re-translation even if translation already exists",
        )
        parser.add_argument(
            "--skip-ru",
            action="store_true",
            help="Skip Russian translation (only translate to English)",
        )
        parser.add_argument(
            "--skip-category",
            action="store_true",
            help="Skip category translation (keep categories as is)",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Batch size for processing",
        )
        parser.add_argument(
            "--shop",
            type=str,
            help="Only translate products from specific shop",
        )
        parser.add_argument(
            "--analyze",
            action="store_true",
            help="Only analyze what needs translation, don't translate",
        )

    def handle(self, *args, **options):
        global STOP_TRANSLATION

        sleep_time = options["sleep"]
        force = options["force"]
        db = options["db"]
        batch_size = options["batch_size"]
        skip_ru = options["skip_ru"]
        skip_category = options["skip_category"]
        shop_filter = options["shop"]
        analyze_only = options["analyze"]

        # Get base queryset
        qs = Product.objects.using(db).all()

        if shop_filter:
            qs = qs.filter(shop__iexact=shop_filter)
            translation_log(f"Filtering by shop: {shop_filter}")

        total = qs.count()

        # First, analyze to find starting point
        translation_log(f"Analyzing translation status for {total} products...")

        # Find the first product ID that needs translation
        start_id = self.find_starting_product_id(qs, force, skip_ru, skip_category)

        if start_id:
            qs = qs.filter(id__gte=start_id)
            remaining = qs.count()
            translation_log(f"Starting from product ID: {start_id}")
            translation_log(f"Remaining products to translate: {remaining}/{total}")
        else:
            translation_log("All products appear to be already translated!")
            if not force:
                translation_log("Use --force to re-translate all products")
                return
            else:
                translation_log("Force flag set, re-translating all products")
                remaining = total

        translation_log(
            f"START translation run | products={remaining}/{total} force={force} "
            f"skip_ru={skip_ru} skip_category={skip_category} shop={shop_filter or 'all'}"
        )

        if analyze_only:
            self.analyze_translations(qs, skip_ru, skip_category)
            return

        offset = 0
        idx = 0
        translated_count = 0
        skipped_count = 0

        while True:
            batch_qs = qs.order_by("id")[offset : offset + batch_size]
            batch_list = list(batch_qs)

            if not batch_list or STOP_TRANSLATION:
                break

            for product in batch_list:
                idx += 1
                if STOP_TRANSLATION:
                    translation_log(f"STOP requested at product {idx}/{remaining}")
                    break

                # Check if product needs translation (in case we're using force or skipped some)
                needs_translation = self.product_needs_translation(
                    product, force, skip_ru, skip_category
                )

                if not needs_translation and not force:
                    skipped_count += 1
                    if skipped_count % 100 == 0:
                        translation_log(
                            f"Skipped {skipped_count} already translated products"
                        )
                    continue

                translated_count += 1
                self.translate_product(
                    product,
                    idx,
                    remaining,
                    force,
                    skip_ru,
                    skip_category,
                    sleep_time,
                    db,
                )

            offset += batch_size
            translation_log(
                f"Completed batch: {min(offset, remaining)}/{remaining} products, "
                f"translated: {translated_count}, skipped: {skipped_count}"
            )

        translation_log(
            f"END translation run. Total products: {total}, "
            f"Translated this run: {translated_count}, Skipped: {skipped_count}"
        )

    def find_starting_product_id(self, qs, force, skip_ru, skip_category):
        """Find the first product ID that needs translation"""
        if force:
            # If force is enabled, start from the beginning
            first_product = qs.order_by("id").first()
            return first_product.id if first_product else None

        # Use binary search to efficiently find the first product needing translation
        translation_log("Searching for first product needing translation...")

        total = qs.count()
        if total == 0:
            return None

        # Check the first few products to get an idea
        sample_size = min(100, total)
        sample_qs = qs.order_by("id")[:sample_size]

        for product in sample_qs:
            if self.product_needs_translation(product, False, skip_ru, skip_category):
                return product.id

        # If first 100 are all translated, use binary search
        min_id = qs.order_by("id").first().id
        max_id = qs.order_by("id").last().id

        # Check if the last product needs translation
        last_product = qs.order_by("id").last()
        if not self.product_needs_translation(
            last_product, False, skip_ru, skip_category
        ):
            # All products are translated
            return None

        # Binary search to find the boundary
        while min_id < max_id:
            mid_id = (min_id + max_id) // 2
            mid_product = qs.filter(id=mid_id).first()

            if not mid_product:
                # Product doesn't exist at this ID, adjust
                min_id = mid_id + 1
                continue

            if self.product_needs_translation(
                mid_product, False, skip_ru, skip_category
            ):
                # This product needs translation, search left
                max_id = mid_id
            else:
                # This product doesn't need translation, search right
                min_id = mid_id + 1

        return min_id

    def product_needs_translation(self, product, force, skip_ru, skip_category):
        """Check if a product needs translation"""
        if force:
            return True

        t_name = product.t_name or {}
        t_variant = product.t_variant or {}
        t_category = product.t_category or {}

        # Check name translations
        if product.name and not t_name.get("en"):
            return True
        if product.name and not skip_ru and not t_name.get("ru"):
            return True

        # Check variant translations
        if product.variant and not t_variant.get("en"):
            return True
        if product.variant and not skip_ru and not t_variant.get("ru"):
            return True

        # Check category translations
        if not skip_category:
            if product.category and not t_category.get("en"):
                return True
            if product.category and not skip_ru and not t_category.get("ru"):
                return True

        return False

    def analyze_translations(self, qs, skip_ru, skip_category):
        """Analyze translation status without actually translating"""
        translation_log("=== TRANSLATION ANALYSIS ===")

        stats = {
            "total": 0,
            "needs_translation": 0,
            "fully_translated": 0,
            "needs_name_en": 0,
            "needs_name_ru": 0,
            "needs_variant_en": 0,
            "needs_variant_ru": 0,
            "needs_category_en": 0,
            "needs_category_ru": 0,
        }

        # Analyze first 200 products for a good sample
        sample_size = min(200, qs.count())
        sample_qs = qs.order_by("id")[:sample_size]

        for product in sample_qs:
            stats["total"] += 1

            t_name = product.t_name or {}
            t_variant = product.t_variant or {}
            t_category = product.t_category or {}

            needs_any = False

            if product.name and not t_name.get("en"):
                stats["needs_name_en"] += 1
                needs_any = True

            if product.name and not skip_ru and not t_name.get("ru"):
                stats["needs_name_ru"] += 1
                needs_any = True

            if product.variant and not t_variant.get("en"):
                stats["needs_variant_en"] += 1
                needs_any = True

            if product.variant and not skip_ru and not t_variant.get("ru"):
                stats["needs_variant_ru"] += 1
                needs_any = True

            if product.category and not t_category.get("en") and not skip_category:
                stats["needs_category_en"] += 1
                needs_any = True

            if (
                product.category
                and not skip_ru
                and not t_category.get("ru")
                and not skip_category
            ):
                stats["needs_category_ru"] += 1
                needs_any = True

            if needs_any:
                stats["needs_translation"] += 1
            else:
                stats["fully_translated"] += 1

        translation_log(f"Analyzed {stats['total']} products (sample):")
        translation_log(
            f"  Need translation: {stats['needs_translation']} ({stats['needs_translation']/stats['total']*100:.1f}%)"
        )
        translation_log(
            f"  Fully translated: {stats['fully_translated']} ({stats['fully_translated']/stats['total']*100:.1f}%)"
        )
        translation_log(f"  Need name EN: {stats['needs_name_en']}")
        if not skip_ru:
            translation_log(f"  Need name RU: {stats['needs_name_ru']}")
        translation_log(f"  Need variant EN: {stats['needs_variant_en']}")
        if not skip_ru:
            translation_log(f"  Need variant RU: {stats['needs_variant_ru']}")
        if not skip_category:
            translation_log(f"  Need category EN: {stats['needs_category_en']}")
            if not skip_ru:
                translation_log(f"  Need category RU: {stats['needs_category_ru']}")
        else:
            translation_log("  Category translation: SKIPPED")

    def translate_product(
        self, product, idx, total, force, skip_ru, skip_category, sleep_time, db
    ):
        """Translate a single product"""
        translation_log(
            f"[{idx}/{total}] Translating {product.external_id or product.id}"
        )

        # Initialize translation dicts if None
        product.t_name = product.t_name or {}
        product.t_variant = product.t_variant or {}
        product.t_category = product.t_category or {}

        # Set Romanian originals
        product.t_name["ro"] = normalize_text(product.name or "")
        product.t_variant["ro"] = normalize_text(product.variant or "")

        # Only set Romanian category if we're translating categories
        if not skip_category:
            product.t_category["ro"] = normalize_text(product.category or "")

        # Translate name
        if product.name and (force or not product.t_name.get("en")):
            product.t_name["en"] = translate_text(product.name or "", "en", "ro")

        if product.name and not skip_ru and (force or not product.t_name.get("ru")):
            if product.t_name.get("en"):
                product.t_name["ru"] = translate_text(product.t_name["en"], "ru", "en")

        # Translate variant
        if product.variant and (force or not product.t_variant.get("en")):
            product.t_variant["en"] = translate_text(product.variant or "", "en", "ro")

        if (
            product.variant
            and not skip_ru
            and (force or not product.t_variant.get("ru"))
        ):
            if product.t_variant.get("en"):
                product.t_variant["ru"] = translate_text(
                    product.t_variant["en"], "ru", "en"
                )

        # Translate category (only if not skipped)
        if not skip_category:
            if product.category and (force or not product.t_category.get("en")):
                product.t_category["en"] = translate_text(
                    product.category or "", "en", "ro"
                )

            if (
                product.category
                and not skip_ru
                and (force or not product.t_category.get("ru"))
            ):
                if product.t_category.get("en"):
                    product.t_category["ru"] = translate_text(
                        product.t_category["en"] or "", "ru", "en"
                    )

        # Save the product
        self.save_product(product, db)
        time.sleep(sleep_time)

    def save_product(self, product, db):
        """Save product with retry logic"""
        saved = False
        for attempt in range(1, MAX_DB_RETRIES + 1):
            try:
                product.save(
                    using=db, update_fields=["t_name", "t_variant", "t_category"]
                )
                saved = True
                break
            except OperationalError as e:
                if "database is locked" in str(e).lower():
                    translation_log(
                        f"DB LOCKED product={product.external_id or product.id} "
                        f"retry={attempt}/{MAX_DB_RETRIES}"
                    )
                    time.sleep(DB_RETRY_SLEEP)
                else:
                    translation_log(
                        f"DB ERROR product={product.external_id or product.id} error={e}"
                    )
                    break

        if not saved:
            translation_log(
                f"FAILED SAVE product={product.external_id or product.id} after retries"
            )
