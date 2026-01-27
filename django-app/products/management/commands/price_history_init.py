from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from products.models import Product, ProductPriceHistory
from products.utils.log.shop_crawler_engine_log import shop_crawler_log

""" 
# Initialize price history for all products in default DB
python manage.py init_price_history --db=default

# If you want to clear existing history first
python manage.py init_price_history --db=default --clear-first

 """


class Command(BaseCommand):
    help = "Initialize price history from all existing products (one-time)"

    BATCH_SIZE = 1000

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database to use (default: 'default')",
        )
        parser.add_argument(
            "--clear-first",
            action="store_true",
            help="Clear all existing price history before initializing",
        )

    def handle(self, *args, **options):
        db = options["db"]
        clear_first = options["clear_first"]

        shop_crawler_log(
            f"[INIT-HISTORY] Starting price history initialization for DB: {db}"
        )

        # Clear existing history if requested
        if clear_first:
            deleted_count = ProductPriceHistory.objects.using(db).all().delete()[0]
            shop_crawler_log(
                f"[INIT-HISTORY] Cleared {deleted_count} existing history entries"
            )

        # Get all products
        total_products = Product.objects.using(db).count()
        shop_crawler_log(f"[INIT-HISTORY] Found {total_products} products to process")

        # Process in batches
        to_create = []
        processed = 0

        # Use iterator to save memory
        products = Product.objects.using(db).all().iterator(chunk_size=self.BATCH_SIZE)

        for product in products:
            # Create initial price history entry for each product
            to_create.append(
                ProductPriceHistory(
                    product=product,
                    archived_product_id=None,
                    shop=product.shop,
                    price=product.price,
                    in_stock=product.in_stock,
                    recorded_at=product.updated_at or timezone.now(),
                )
            )

            # Batch insert
            if len(to_create) >= self.BATCH_SIZE:
                with transaction.atomic(using=db):
                    ProductPriceHistory.objects.using(db).bulk_create(
                        to_create, batch_size=self.BATCH_SIZE
                    )
                processed += len(to_create)
                shop_crawler_log(
                    f"[INIT-HISTORY] Processed {processed}/{total_products} products"
                )
                to_create.clear()

        # Final batch
        if to_create:
            with transaction.atomic(using=db):
                ProductPriceHistory.objects.using(db).bulk_create(
                    to_create, batch_size=self.BATCH_SIZE
                )
            processed += len(to_create)

        shop_crawler_log(
            f"[INIT-HISTORY] Completed! Created {processed} price history entries"
        )
