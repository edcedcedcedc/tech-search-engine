from django.core.management.base import BaseCommand
from products.models import Product
from products.utils.db_inspect_products_log import db_inspect_products_log
from django.db.models import Q


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
            "--list-categories",
            action="store_true",
            help="Ignore everything else and list distinct categories",
        )

        parser.add_argument(
            "--list-tcategories",
            action="store_true",
            help="Ignore everything else and list distinct categories",
        )

    def handle(self, *args, **options):
        db = "stage"
        batch_size = options["batch_size"]
        dirty_only = options["dirty_only"]
        shop_filter = options["shop"]
        empty_category_only = options["empty_categories"]
        list_categories = options["list_categories"]
        list_tcategories = options["list_tcategories"]
        qs = Product.objects.using(db).all().order_by("id")
        db_inspect_products_log(f"Using database {db}")

        if list_categories:
            # Only list distinct categories
            categories = (
                Product.objects.using(db)
                .values_list("category", flat=True)
                .distinct()
                .order_by("category")
            )
            db_inspect_products_log("Distinct categories in DB:")
            for cat in categories:
                db_inspect_products_log(f"- {cat or 'EMPTY'}")
            return  # Stop here, ignore other filters or inspections

        if list_tcategories:
            db_inspect_products_log("Distinct t_categories grouped by RO value:")

            qs = Product.objects.using(db).values_list("t_category", flat=True)

            grouped = {}  # ro_value -> set of serialized variants

            for tcat in qs:
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

            for ro_key in sorted(grouped.keys()):
                db_inspect_products_log(f"\nRO = {ro_key}")
                for variant in grouped[ro_key]:
                    db_inspect_products_log(f"  - {variant}")

            return

        # Apply other filters
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

        # Iterate in batches to avoid memory issues
        start = 0
        while start < total:
            batch = qs[start : start + batch_size]
            for p in batch:
                db_inspect_products_log(
                    f"\n"
                    f"id={p.id}\n"
                    f"name={p.name}\n"
                    f"t_name={p.t_name}\n"
                    f"t_variant={p.t_variant}\n"
                    f"t_category={p.t_category}\n"
                    f"category={p.category}\n"
                )
            start += batch_size
