# products/management/commands/broken.py
# products/management/commands/broken.py
from django.core.management.base import BaseCommand, CommandError
from products.models import Product
from django.db import transaction, IntegrityError
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from django.db.models import Q


class Command(BaseCommand):
    help = (
        "Move broken products from source DB to destination DB and delete them. "
        "Run in ONE mode only: --by-category OR --by-translation. "
        "Use --dry-run to preview what would be moved without actually moving."
    )

    def add_arguments(self, parser):
        parser.add_argument("--source", type=str, default="default")
        parser.add_argument("--dest", type=str, required=True)
        parser.add_argument("--batch-size", type=int, default=500)
        parser.add_argument("--by-category", action="store_true")
        parser.add_argument("--by-translation", action="store_true")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only report what would be moved without actually moving anything",
        )

    def handle(self, *args, **options):
        source_db = options["source"]
        dest_db = options["dest"]
        batch_size = options["batch_size"]
        by_category = options["by_category"]
        by_translation = options["by_translation"]
        dry_run = options["dry_run"]

        if by_category == by_translation:
            raise CommandError(
                "You must specify EXACTLY ONE mode: --by-category OR --by-translation"
            )

        shop_crawler_log(
            f"Starting BROKEN move from '{source_db}' to '{dest_db}' "
            f"(mode={'category' if by_category else 'translation'}, dry_run={dry_run})"
        )

        # ------------------------------
        # MODE 1: CATEGORY = Move items whose category NOT in default
        # ------------------------------
        if by_category:
            default_categories = set(
                c.strip().lower()
                for c in Product.objects.using("default")
                .exclude(category__isnull=True)
                .exclude(category="")
                .values_list("category", flat=True)
                .distinct()
            )

            all_source_products = (
                Product.objects.using(source_db)
                .exclude(category__isnull=True)
                .exclude(category="")
                .order_by("id")
            )

            broken_products = [
                p
                for p in all_source_products
                if (p.category or "").strip().lower() not in default_categories
            ]

        # ------------------------------
        # MODE 2: TRANSLATION ONLY
        # ------------------------------
        else:
            broken_products = list(
                Product.objects.using(source_db)
                .filter(
                    Q(t_name__isnull=True)
                    | Q(t_name__en__isnull=True)
                    | Q(t_name__en="")
                    | Q(t_name__ro__isnull=True)
                    | Q(t_name__ro="")
                    | Q(t_name__ru__isnull=True)
                    | Q(t_name__ru="")
                    | Q(variant__isnull=False, t_variant__isnull=True)
                    | Q(variant__isnull=False, t_variant__en__isnull=True)
                    | Q(variant__isnull=False, t_variant__en="")
                    | Q(variant__isnull=False, t_variant__ro__isnull=True)
                    | Q(variant__isnull=False, t_variant__ro="")
                    | Q(variant__isnull=False, t_variant__ru__isnull=True)
                    | Q(variant__isnull=False, t_variant__ru="")
                )
                .order_by("id")
            )

        total = len(broken_products)
        shop_crawler_log(f"Found {total} products to move")

        if dry_run:
            shop_crawler_log("DRY-RUN: No products will be moved or deleted.")
            for p in broken_products[:20]:
                shop_crawler_log(f"- {p.id}: {p.category} / {p.name}")
            if total > 20:
                shop_crawler_log(f"...and {total-20} more products would be moved")
            return

        moved_count = 0
        failed_count = 0

        for start in range(0, total, batch_size):
            batch = broken_products[start : start + batch_size]
            if not batch:
                continue

            ids_to_delete = [p.id for p in batch]

            bulk_objects = [
                Product(
                    external_id=p.external_id,
                    canonical_id=p.canonical_id,
                    name=p.name,
                    variant=p.variant,
                    price=p.price,
                    in_stock=p.in_stock,
                    shop=p.shop,
                    category=p.category,
                    t_name=p.t_name,
                    t_variant=p.t_variant,
                    t_category=p.t_category,
                    dirty=getattr(p, "dirty", None),
                )
                for p in batch
            ]

            # Insert into destination DB
            with transaction.atomic(using=dest_db):
                try:
                    Product.objects.using(dest_db).bulk_create(bulk_objects)
                    moved_count += len(batch)
                except IntegrityError:
                    failed_count += len(batch)

            # Delete from source DB regardless
            with transaction.atomic(using=source_db):
                Product.objects.using(source_db).filter(id__in=ids_to_delete).delete()

        shop_crawler_log(
            f"FINISHED. Moved={moved_count}, Unique/Failed moved={failed_count}"
        )
