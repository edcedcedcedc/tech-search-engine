from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Max

from products.models import Product, ProductPriceHistory
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


class Command(BaseCommand):
    help = "Seed & sync ProductPriceHistory from Product table (default DB only)"

    BATCH_SIZE = 1000

    def handle(self, *args, **options):

        now = timezone.now()

        # ------------------------------------------------------------------
        # 1. Load latest history per product (ONE QUERY)
        # ------------------------------------------------------------------
        latest_history = {
            row["product_id"]: row["max_id"]
            for row in (
                ProductPriceHistory.objects.using("default")
                .values("product_id")
                .annotate(max_id=Max("id"))
            )
        }

        history_map = {
            h.id: h
            for h in ProductPriceHistory.objects.using("default").filter(
                id__in=latest_history.values()
            )
        }

        # ------------------------------------------------------------------
        # 2. Iterate products in batches
        # ------------------------------------------------------------------
        products = (
            Product.objects.using("default").all().iterator(chunk_size=self.BATCH_SIZE)
        )

        to_create = []
        to_update = []

        created = 0
        updated = 0
        skipped = 0

        for product in products:
            last_id = latest_history.get(product.id)

            # --------------------------------------------------------------
            # No history → CREATE
            # --------------------------------------------------------------
            if not last_id:
                to_create.append(
                    ProductPriceHistory(
                        product=product,
                        archived_product_id=None,
                        shop=product.shop,
                        price=product.price,
                        in_stock=product.in_stock,
                        recorded_at=now,
                    )
                )
                continue

            last = history_map[last_id]

            # --------------------------------------------------------------
            # History exists → UPDATE if changed
            # --------------------------------------------------------------
            if last.price != product.price or last.in_stock != product.in_stock:
                last.price = product.price
                last.in_stock = product.in_stock
                last.shop = product.shop
                last.recorded_at = now
                to_update.append(last)
            else:
                skipped += 1

            # --------------------------------------------------------------
            # Flush batches
            # --------------------------------------------------------------
            if len(to_create) >= self.BATCH_SIZE:
                ProductPriceHistory.objects.using("default").bulk_create(
                    to_create, batch_size=self.BATCH_SIZE
                )
                created += len(to_create)
                to_create.clear()

            if len(to_update) >= self.BATCH_SIZE:
                ProductPriceHistory.objects.using("default").bulk_update(
                    to_update,
                    fields=["price", "in_stock", "shop", "recorded_at"],
                    batch_size=self.BATCH_SIZE,
                )
                updated += len(to_update)
                to_update.clear()

        # ------------------------------------------------------------------
        # 3. Final flush
        # ------------------------------------------------------------------
        if to_create:
            ProductPriceHistory.objects.using("default").bulk_create(
                to_create, batch_size=self.BATCH_SIZE
            )
            created += len(to_create)

        if to_update:
            ProductPriceHistory.objects.using("default").bulk_update(
                to_update,
                fields=["price", "in_stock", "shop", "recorded_at"],
                batch_size=self.BATCH_SIZE,
            )
            updated += len(to_update)
