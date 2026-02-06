from django.core.management.base import BaseCommand
from products.models import Product, ArchivedProduct, ArchivedBrokenProduct
from products.utils.log.db_inspect_products_log import db_inspect_products_log
from django.db.models import Q
import os
from django.conf import settings


class Command(BaseCommand):
    help = "Inspect products or list categories in the DB"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Number of objects to fetch per batch",
        )
        parser.add_argument(
            "--dirty-only",
            action="store_true",
            help="Inspect only products marked dirty=True",
        )
        parser.add_argument(
            "--shop",
            type=str,
            default=None,
            help="Inspect only products from a specific shop",
        )
        parser.add_argument(
            "--empty-categories",
            action="store_true",
            help="Inspect only products where category is empty",
        )
        parser.add_argument(
            "--categories",
            action="store_true",
            help="Ignore everything else and list distinct categories",
        )
        parser.add_argument(
            "--tcategories",
            action="store_true",
            help="Ignore everything else and list distinct t_categories",
        )
        parser.add_argument(
            "--all-tables",
            action="store_true",
            help="Include Product, ArchivedProduct, and ArchivedBrokenProduct",
        )
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database alias to use (default: 'default')",
        )

    def handle(self, *args, **options):
        db = options["db"]
        batch_size = options["batch_size"]
        dirty_only = options["dirty_only"]
        shop_filter = options["shop"]
        empty_category_only = options["empty_categories"]
        list_categories = options["categories"]
        list_tcategories = options["tcategories"]
        all_tables = options["all_tables"]

        BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

        LOG_FILE = os.path.join(BASE_DIR, "logs", "999inspect.log")

        if os.path.exists(LOG_FILE):
            os.remove(LOG_FILE)

        db_inspect_products_log(f"Using database: {db}")

        models_to_use = [Product]
        if all_tables:
            models_to_use = [Product, ArchivedProduct, ArchivedBrokenProduct]

        # --- LIST CATEGORIES ---
        if list_categories:
            categories = set()
            for model in models_to_use:
                qs = model.objects.using(db)
                if shop_filter:
                    qs = qs.filter(shop__iexact=shop_filter)
                categories.update(
                    [
                        c or "EMPTY"
                        for c in qs.values_list("category", flat=True).distinct()
                    ]
                )
            db_inspect_products_log("Distinct categories across selected tables:")
            for cat in sorted(categories):
                db_inspect_products_log(f"- {cat}")
            return

        # --- LIST T_CATEGORIES ---
        if list_tcategories:
            grouped = {}
            for model in models_to_use:
                qs = model.objects.using(db)
                if shop_filter:
                    qs = qs.filter(shop__iexact=shop_filter)
                for tcat in qs.values_list("t_category", flat=True):
                    if not tcat or not isinstance(tcat, dict):
                        ro_key = "EMPTY"
                        variant = "{}"
                    else:
                        ro_key = (tcat.get("ro") or "EMPTY").strip().lower()
                        variant = str(
                            {
                                "ro": tcat.get("ro", ""),
                                "en": tcat.get("en", ""),
                                "ru": tcat.get("ru", ""),
                            }
                        )
                    grouped.setdefault(ro_key, set()).add(variant)

            db_inspect_products_log(
                "Distinct t_categories grouped by RO value across selected tables:"
            )
            for ro_key in sorted(grouped.keys()):
                db_inspect_products_log(f"\nRO = {ro_key}")
                for variant in grouped[ro_key]:
                    db_inspect_products_log(f"  - {variant}")
            return

        # --- NORMAL INSPECTION ---
        qs = Product.objects.using(db).all().order_by("id")
        if dirty_only:
            qs = qs.filter(dirty=True)
        if shop_filter:
            qs = qs.filter(shop__iexact=shop_filter)
            db_inspect_products_log(f"Filtering by shop: {shop_filter}")
        if empty_category_only:
            qs = qs.filter(Q(category__isnull=True) | Q(category=""))
            db_inspect_products_log("Filtering only products with empty category")

        total = qs.count()
        db_inspect_products_log(f"Total products to inspect: {total}")
        start = 0
        while start < total:
            batch = qs[start : start + batch_size]
            for p in batch:
                db_inspect_products_log(
                    f"\n"
                    f"id={p.id}\n"
                    f"external_id={p.external_id}\n"
                    f"name={p.name}\n"
                    f"variant={p.variant}\n"
                    f"price={p.price}\n"
                    f"shop={p.shop}\n"
                    f"in_stock={p.in_stock}\n"
                    f"category={p.category}\n"
                    f"t_name={p.t_name}\n"
                    f"t_variant={p.t_variant}\n"
                    f"t_category={p.t_category}\n"
                    f"embedding={p.embedding if db != 'default' else 'embedding hidden for default db'}\n"
                    f"brand={p.brand}\n"
                    f"updated_at={p.updated_at}\n"
                    f"created_at={p.created_at}\n"
                    f"url={p.url}\n"
                )
            start += batch_size
