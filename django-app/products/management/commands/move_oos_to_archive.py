import time
from django.core.management.base import BaseCommand
from django.utils import timezone
from products.models import Product, ArchivedProduct, ProductPriceHistory
from products.utils.log.shop_crawler_engine_log import shop_crawler_log

BATCH_SIZE = 500  # Adjust depending on your DB performance


class Command(BaseCommand):
    help = "Move all out-of-stock products from a source DB to archive"

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=str,
            default="broken",
            help="Source DB containing out-of-stock products",
        )
        parser.add_argument(
            "--dest",
            type=str,
            default="default",
            help="Destination DB for ArchivedProduct",
        )

    def handle(self, *args, **options):
        source_db = options["source"]
        dest_db = options["dest"]

        start_time = time.time()

        # Get all out-of-stock product IDs upfront
        product_ids = list(
            Product.objects.using(source_db)
            .filter(in_stock=False)
            .values_list("id", flat=True)
        )
        total = len(product_ids)
        shop_crawler_log(f"Found {total} out-of-stock products in {source_db}.")

        processed = 0

        while processed < total:
            batch_ids = product_ids[processed : processed + BATCH_SIZE]
            batch_products = list(
                Product.objects.using(source_db).filter(id__in=batch_ids)
            )

            # Skip products already archived
            existing_keys = set(
                ArchivedProduct.objects.using(dest_db)
                .filter(
                    shop__in=[p.shop for p in batch_products],
                    external_id__in=[p.external_id for p in batch_products],
                )
                .values_list("shop", "external_id")
            )

            archived_objects = []
            relink_map = {}  # original_id -> ArchivedProduct

            for product in batch_products:
                key = (product.shop, product.external_id)
                if key in existing_keys:
                    continue  # Already archived

                archived = ArchivedProduct(
                    shop=product.shop,
                    external_id=product.external_id,
                    canonical_id=product.canonical_id or "",
                    name=product.name,
                    variant=product.variant,
                    price=product.price,
                    in_stock=product.in_stock,
                    archived_at=timezone.now(),
                    original_id=product.id,
                    url=product.url,
                )
                archived_objects.append(archived)

            if archived_objects:
                # Bulk create
                ArchivedProduct.objects.using(dest_db).bulk_create(
                    archived_objects, batch_size=BATCH_SIZE
                )

                # Map original_id -> archived instance
                archived_instances = ArchivedProduct.objects.using(dest_db).filter(
                    original_id__in=[a.original_id for a in archived_objects]
                )
                for a in archived_instances:
                    relink_map[a.original_id] = a

                # Bulk relink price history
                for original_id, archived in relink_map.items():
                    ProductPriceHistory.objects.using(source_db).filter(
                        product_id=original_id
                    ).update(product=None, archived_product_id=archived.id)

                # Delete original products
                Product.objects.using(source_db).filter(
                    id__in=[a.original_id for a in archived_objects]
                ).delete()

            processed += len(batch_ids)
            shop_crawler_log(f"Processed {processed}/{total} products...")

        shop_crawler_log(
            f"Completed moving out-of-stock products from {source_db} to archive in {round(time.time() - start_time, 2)}s"
        )
