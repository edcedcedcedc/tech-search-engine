import signal
import time
import re
import sys
import os
import json


# ========== CRITICAL: BLOCK OPENAI IMPORT BEFORE ANYTHING ELSE ==========
# This is the KEY to running in venv_translate without openai
import builtins


_real_import = builtins.__import__


def _block_openai_import(name, globals=None, locals=None, fromlist=(), level=0):
    """Block openai import to avoid errors in translation venv"""
    if name == "openai":
        # Create a fake openai module
        fake_module = type(sys)("openai")

        class FakeOpenAI:
            def __init__(self, *args, **kwargs):
                pass

        fake_module.OpenAI = FakeOpenAI
        return fake_module

    return _real_import(name, globals, locals, fromlist, level)


# Apply the monkey patch
builtins.__import__ = _block_openai_import

# ========== NOW setup Django ==========
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")

try:
    import django

    django.setup()
except Exception as e:
    translation_log(f"Failed to setup Django: {e}")
    translation_log("Make sure you're in the project directory and Django is installed")
    sys.exit(1)

# ========== Import Django components ==========
from django.core.management.base import BaseCommand
from django.db.utils import OperationalError
from django.db import models

# ========== Import your project modules ==========
try:
    from products.models import Product
    from products.utils.log.translation_log import translation_log
except ImportError as e:
    translation_log(f"Failed to import project modules: {e}")
    translation_log(
        "Make sure you're in the correct directory and venv_translate is activated"
    )
    sys.exit(1)

# ========== Import and handle normalize_text ==========
try:
    from products.utils.utils import normalize_text
except ImportError:
    # If normalize_text fails to import (due to DRF dependency), create a simple version
    translation_log("WARNING: normalize_text not found, using simple version")

    def normalize_text(text: str) -> str:
        """Simple text normalization"""
        if not text:
            return ""
        # Basic normalization: strip, lowercase, remove extra spaces
        text = str(text).strip()
        text = " ".join(text.split())  # Remove extra whitespace
        return text


# ========== Import googletrans ==========
try:
    from googletrans import Translator
except ImportError:
    translation_log("ERROR: googletrans not installed in venv_translate!")
    translation_log("Run: pip install googletrans==4.0.0-rc1")
    sys.exit(1)

# ========== Constants ==========
MAX_DB_RETRIES = 5
DB_RETRY_SLEEP = 60
MAX_RETRIES = 3
SLEEP_BETWEEN_REQUESTS = 1.0

# ========== Initialize translator ==========
translator = Translator()
STOP_TRANSLATION = False


# ========== Signal handler ==========
def signal_handler(sig, frame):
    global STOP_TRANSLATION
    translation_log("\nReceived Ctrl+C, stopping translation gracefully...")
    translation_log("INTERRUPTED by user (Ctrl+C)")
    STOP_TRANSLATION = True


signal.signal(signal.SIGINT, signal_handler)


# ========== Translation function ==========
def translate_text(text: str, dest_lang: str, source_lang: str) -> str:
    """
    Translate text with retry and sleep to prevent timeouts.
    """
    if not text or not text.strip():
        return ""

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            translation_log(
                f"Translating '{text[:50]}...' from {source_lang} to {dest_lang} (attempt {attempt})"
            )
            translated = translator.translate(text, src=source_lang, dest=dest_lang)
            time.sleep(SLEEP_BETWEEN_REQUESTS)
            return normalize_text(translated.text)
        except Exception as e:
            translation_log(
                f"TRANSLATION FAILED ({source_lang}->{dest_lang}) "
                f"text='{text[:50]}...' attempt={attempt} error='{e}'"
            )
            time.sleep(2 * attempt)

    translation_log(
        f"TRANSLATION SKIPPED ({source_lang}->{dest_lang}) text='{text[:50]}...' after {MAX_RETRIES} attempts"
    )
    return text


# ========== Main Command Class ==========
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
        parser.add_argument(
            "--skip-translated",
            action="store_true",
            help="Skip already translated products and start from first untranslated",
        )
        parser.add_argument(
            "--ids",
            type=str,
            help="Comma-separated list of product IDs to translate (e.g., '1,2,3,4,5')",
        )
        parser.add_argument(
            "--ids-file",
            type=str,
            help="Path to file containing product IDs (one per line or JSON array)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Limit number of products to process (for testing)",
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
        skip_translated = options["skip_translated"]
        ids_input = options["ids"]
        ids_file = options["ids_file"]
        limit = options["limit"]

        # Get product IDs from input
        product_ids = self.get_product_ids(ids_input, ids_file)

        # Get base queryset
        qs = Product.objects.using(db).all()

        # Apply ID filter if provided
        if product_ids:
            qs = qs.filter(id__in=product_ids)
            translation_log(f"Filtering by {len(product_ids)} product IDs")

        if shop_filter:
            qs = qs.filter(shop__iexact=shop_filter)
            translation_log(f"Filtering by shop: {shop_filter}")

        if limit:
            qs = qs[:limit]
            translation_log(f"Limiting to {limit} products")

        total = qs.count()

        if total == 0:
            translation_log(f"No products found")
            return

        # FAST SCAN: Find where to start if skip_translated is enabled
        starting_id = None
        if skip_translated and not force and not product_ids:
            # Only do fast scan if we're not processing specific IDs
            translation_log(f"FAST SCAN: Finding first product needing translation...")
            starting_id = self.find_starting_product_id_fast(qs, skip_ru, skip_category)

            if starting_id:
                qs = qs.filter(id__gte=starting_id)
                remaining = qs.count()
                translation_log(f"Starting from product ID: {starting_id}")
                translation_log(f"Remaining products to translate: {remaining}/{total}")
            else:
                translation_log("All products are already translated!")
                return

        translation_log(
            f"START translation run | products={qs.count()}/{total} force={force} "
            f"skip_ru={skip_ru} skip_category={skip_category} shop={shop_filter or 'all'} "
            f"skip_translated={skip_translated} ids_provided={bool(product_ids)}"
        )

        if analyze_only:
            self.analyze_translations(qs, skip_ru, skip_category)
            return

        offset = 0
        idx = 0
        translated_count = 0
        skipped_count = 0

        while True:
            # Order by ID for consistency, but if we have specific IDs, maintain their order
            if product_ids:
                # Preserve the order of IDs from input
                batch_ids = product_ids[offset : offset + batch_size]
                batch_qs = qs.filter(id__in=batch_ids)
                # Create a custom ordering based on input order
                batch_dict = {p.id: p for p in batch_qs}
                batch_list = [batch_dict[pid] for pid in batch_ids if pid in batch_dict]
            else:
                batch_qs = qs.order_by("id")[offset : offset + batch_size]
                batch_list = list(batch_qs)

            if not batch_list or STOP_TRANSLATION:
                break

            for product in batch_list:
                idx += 1
                if STOP_TRANSLATION:
                    translation_log(f"STOP requested at product {idx}/{qs.count()}")
                    break

                # Quick check if product needs translation (no API calls)
                if not force and self.is_product_translated(
                    product, skip_ru, skip_category
                ):
                    skipped_count += 1
                    if skipped_count % 1000 == 0:
                        translation_log(
                            f"Skipped {skipped_count} already translated products"
                        )
                    continue

                translated_count += 1
                self.translate_product(
                    product,
                    idx,
                    qs.count(),
                    force,
                    skip_ru,
                    skip_category,
                    sleep_time,
                    db,
                )

            offset += batch_size
            translation_log(
                f"Completed batch: {min(offset, qs.count())}/{qs.count()} products, "
                f"translated: {translated_count}, skipped: {skipped_count}"
            )

        translation_log(
            f"END translation run. Total scanned: {total}, "
            f"Translated this run: {translated_count}, Skipped: {skipped_count}"
        )

    def get_product_ids(self, ids_input, ids_file):
        """Parse product IDs from command line or file"""
        product_ids = []

        # Priority: ids-file over ids input
        if ids_file:
            try:
                with open(ids_file, "r") as f:
                    content = f.read().strip()

                    # Try to parse as JSON first
                    try:
                        data = json.loads(content)
                        if isinstance(data, list):
                            product_ids = [int(id) for id in data]
                        else:
                            # Assume it's a JSON object with ids field
                            product_ids = [int(id) for id in data.get("ids", [])]
                    except json.JSONDecodeError:
                        # Parse as plain text (one per line or comma-separated)
                        lines = content.split("\n")
                        for line in lines:
                            line = line.strip()
                            if line:
                                # Handle comma-separated values in a line
                                if "," in line:
                                    product_ids.extend(
                                        [
                                            int(id.strip())
                                            for id in line.split(",")
                                            if id.strip()
                                        ]
                                    )
                                else:
                                    product_ids.append(int(line))

                translation_log(f"Loaded {len(product_ids)} IDs from file: {ids_file}")

            except Exception as e:
                translation_log(f"Error reading IDs file {ids_file}: {e}")
                sys.exit(1)

        elif ids_input:
            try:
                # Parse comma-separated IDs
                product_ids = [
                    int(id.strip()) for id in ids_input.split(",") if id.strip()
                ]
                translation_log(f"Parsed {len(product_ids)} IDs from command line")
            except ValueError as e:
                translation_log(f"Invalid ID format in --ids parameter: {e}")
                sys.exit(1)

        # Remove duplicates while preserving order
        if product_ids:
            seen = set()
            unique_ids = []
            for pid in product_ids:
                if pid not in seen:
                    seen.add(pid)
                    unique_ids.append(pid)

            if len(unique_ids) < len(product_ids):
                translation_log(
                    f"Removed {len(product_ids) - len(unique_ids)} duplicate IDs"
                )

            product_ids = unique_ids

        return product_ids

    def find_starting_product_id_fast(self, qs, skip_ru, skip_category):
        """
        FAST method to find first product needing translation without API calls
        Uses binary search on database queries
        """
        total = qs.count()
        if total == 0:
            return None

        # Get ID range
        min_id_result = qs.aggregate(min_id=models.Min("id"))
        max_id_result = qs.aggregate(max_id=models.Max("id"))

        if not min_id_result["min_id"] or not max_id_result["max_id"]:
            return None

        min_id = min_id_result["min_id"]
        max_id = max_id_result["max_id"]

        translation_log(f"Scanning ID range: {min_id} to {max_id}")

        # Binary search
        while min_id < max_id:
            mid_id = (min_id + max_id) // 2

            # Check if mid_id product is translated
            mid_product = qs.filter(id=mid_id).first()
            if not mid_product:
                # Product doesn't exist, adjust range
                min_id = mid_id + 1
                continue

            if self.is_product_translated(mid_product, skip_ru, skip_category):
                # This product is translated, need to check later products
                min_id = mid_id + 1
            else:
                # This product needs translation, check earlier
                max_id = mid_id

        # Verify the found product actually needs translation
        found_product = qs.filter(id=min_id).first()
        if found_product and not self.is_product_translated(
            found_product, skip_ru, skip_category
        ):
            return min_id

        # Check if the last product needs translation (edge case)
        last_product = qs.filter(id=max_id).first()
        if last_product and not self.is_product_translated(
            last_product, skip_ru, skip_category
        ):
            return max_id

        return None

    def is_product_translated(self, product, skip_ru, skip_category):
        """
        Quick check if a product is already translated (no API calls)
        """
        t_name = product.t_name or {}
        t_variant = product.t_variant or {}
        t_category = product.t_category or {}

        # Check name
        if product.name and product.name.strip():
            if not t_name.get("en"):
                return False
            if not skip_ru and not t_name.get("ru"):
                return False

        # Check variant
        if product.variant and product.variant.strip():
            if not t_variant.get("en"):
                return False
            if not skip_ru and not t_variant.get("ru"):
                return False

        # Check category
        if not skip_category and product.category and product.category.strip():
            if not t_category.get("en"):
                return False
            if not skip_ru and not t_category.get("ru"):
                return False

        return True

    def analyze_translations(self, qs, skip_ru, skip_category):
        """Analyze translation status without actually translating"""
        translation_log("=== TRANSLATION ANALYSIS ===")

        stats = {
            "total": 0,
            "translated": 0,
            "needs_translation": 0,
            "needs_name_en": 0,
            "needs_name_ru": 0,
            "needs_variant_en": 0,
            "needs_variant_ru": 0,
            "needs_category_en": 0,
            "needs_category_ru": 0,
        }

        # Analyze first 200 products
        sample_size = min(200, qs.count())
        sample_qs = qs.order_by("id")[:sample_size]

        for product in sample_qs:
            stats["total"] += 1

            t_name = product.t_name or {}
            t_variant = product.t_variant or {}
            t_category = product.t_category or {}

            needs_translation = False

            if product.name and not t_name.get("en"):
                stats["needs_name_en"] += 1
                needs_translation = True

            if product.name and not skip_ru and not t_name.get("ru"):
                stats["needs_name_ru"] += 1
                needs_translation = True

            if product.variant and not t_variant.get("en"):
                stats["needs_variant_en"] += 1
                needs_translation = True

            if product.variant and not skip_ru and not t_variant.get("ru"):
                stats["needs_variant_ru"] += 1
                needs_translation = True

            if product.category and not t_category.get("en") and not skip_category:
                stats["needs_category_en"] += 1
                needs_translation = True

            if (
                product.category
                and not skip_ru
                and not t_category.get("ru")
                and not skip_category
            ):
                stats["needs_category_ru"] += 1
                needs_translation = True

            if needs_translation:
                stats["needs_translation"] += 1
            else:
                stats["translated"] += 1

        translation_log(f"Analyzed {stats['total']} products (sample):")
        translation_log(
            f"  Translated: {stats['translated']} ({stats['translated']/stats['total']*100:.1f}%)"
        )
        translation_log(
            f"  Needs translation: {stats['needs_translation']} ({stats['needs_translation']/stats['total']*100:.1f}%)"
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
