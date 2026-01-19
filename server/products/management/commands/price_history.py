from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Max, Q

from products.models import Product, ArchivedProduct, ProductPriceHistory
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


class Command(BaseCommand):
    help = "Create price history for ALL products (active + archived)"

    BATCH_SIZE = 1000

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database to use (default: 'default')",
        )
        parser.add_argument(
            "--include-archived",
            action="store_true",
            help="Include archived products in history creation",
        )

    def handle(self, *args, **options):
        db = options["db"]
        include_archived = options["include_archived"]

        now = timezone.now()

        shop_crawler_log(f"[HISTORY] Starting price history for DB: {db}")
        shop_crawler_log(f"[HISTORY] Include archived: {include_archived}")

        total_created = 0
        total_skipped = 0

        # ------------------------------------------------------------------
        # 1. PROCESS ACTIVE PRODUCTS
        # ------------------------------------------------------------------
        shop_crawler_log("[HISTORY] Processing active products...")

        # Load latest history for active products
        latest_active_history = {
            row["product_id"]: row["max_id"]
            for row in (
                ProductPriceHistory.objects.using(db)
                .filter(product__isnull=False)
                .values("product_id")
                .annotate(max_id=Max("id"))
            )
        }

        active_history_map = {}
        if latest_active_history:
            active_history_map = {
                h.id: h
                for h in ProductPriceHistory.objects.using(db).filter(
                    id__in=latest_active_history.values()
                )
            }

        # Process active products
        to_create = []
        active_created = 0
        active_skipped = 0

        products = Product.objects.using(db).all().iterator(chunk_size=self.BATCH_SIZE)

        for product in products:
            last_id = latest_active_history.get(product.id)

            if not last_id:
                # No history → CREATE
                to_create.append(
                    ProductPriceHistory(
                        product=product,
                        archived_product=None,
                        shop=product.shop,
                        price=product.price,
                        in_stock=product.in_stock,
                        recorded_at=product.updated_at or now,
                    )
                )
            else:
                last = active_history_map.get(last_id)
                if last and (
                    last.price != product.price or last.in_stock != product.in_stock
                ):
                    # Price/stock changed → CREATE NEW ENTRY
                    to_create.append(
                        ProductPriceHistory(
                            product=product,
                            archived_product=None,
                            shop=product.shop,
                            price=product.price,
                            in_stock=product.in_stock,
                            recorded_at=now,
                        )
                    )
                else:
                    active_skipped += 1

            # Flush batch
            if len(to_create) >= self.BATCH_SIZE:
                ProductPriceHistory.objects.using(db).bulk_create(
                    to_create, batch_size=self.BATCH_SIZE
                )
                active_created += len(to_create)
                to_create.clear()

        # Final flush for active products
        if to_create:
            ProductPriceHistory.objects.using(db).bulk_create(
                to_create, batch_size=self.BATCH_SIZE
            )
            active_created += len(to_create)
            to_create.clear()

        total_created += active_created
        total_skipped += active_skipped

        shop_crawler_log(
            f"[HISTORY] Active: Created {active_created}, Skipped {active_skipped}"
        )

        # ------------------------------------------------------------------
        # 2. PROCESS ARCHIVED PRODUCTS (if requested)
        # ------------------------------------------------------------------
        archived_created = 0
        archived_skipped = 0

        if include_archived:
            shop_crawler_log("[HISTORY] Processing archived products...")

            # Load latest history for archived products
            latest_archived_history = {
                row["archived_product_id"]: row["max_id"]
                for row in (
                    ProductPriceHistory.objects.using(db)
                    .filter(archived_product__isnull=False)
                    .values("archived_product_id")
                    .annotate(max_id=Max("id"))
                )
            }

            archived_history_map = {}
            if latest_archived_history:
                archived_history_map = {
                    h.id: h
                    for h in ProductPriceHistory.objects.using(db).filter(
                        id__in=latest_archived_history.values()
                    )
                }

            # Process archived products
            archived_products = (
                ArchivedProduct.objects.using(db)
                .all()
                .iterator(chunk_size=self.BATCH_SIZE)
            )

            for archived in archived_products:
                last_id = latest_archived_history.get(archived.id)

                if not last_id:
                    # No history for this archived product → CREATE
                    to_create.append(
                        ProductPriceHistory(
                            product=None,
                            archived_product=archived,
                            shop=archived.shop,
                            price=archived.price,
                            in_stock=archived.in_stock,
                            recorded_at=archived.archived_at or now,
                        )
                    )
                else:
                    last = archived_history_map.get(last_id)
                    if last and (
                        last.price != archived.price
                        or last.in_stock != archived.in_stock
                    ):
                        # Changed since last history → CREATE NEW
                        to_create.append(
                            ProductPriceHistory(
                                product=None,
                                archived_product=archived,
                                shop=archived.shop,
                                price=archived.price,
                                in_stock=archived.in_stock,
                                recorded_at=now,
                            )
                        )
                    else:
                        archived_skipped += 1

                # Flush batch
                if len(to_create) >= self.BATCH_SIZE:
                    ProductPriceHistory.objects.using(db).bulk_create(
                        to_create, batch_size=self.BATCH_SIZE
                    )
                    archived_created += len(to_create)
                    to_create.clear()

            # Final flush for archived products
            if to_create:
                ProductPriceHistory.objects.using(db).bulk_create(
                    to_create, batch_size=self.BATCH_SIZE
                )
                archived_created += len(to_create)
                to_create.clear()

            total_created += archived_created
            total_skipped += archived_skipped

            shop_crawler_log(
                f"[HISTORY] Archived: Created {archived_created}, Skipped {archived_skipped}"
            )

        # ------------------------------------------------------------------
        # 3. SUMMARY
        # ------------------------------------------------------------------
        shop_crawler_log(
            f"[HISTORY] COMPLETED: "
            f"Total created: {total_created} "
            f"Total skipped: {total_skipped}"
        )

        # Show counts for reference
        active_count = Product.objects.using(db).count()
        archived_count = (
            ArchivedProduct.objects.using(db).count() if include_archived else 0
        )

        shop_crawler_log(
            f"[HISTORY] TOTALS: "
            f"Active products: {active_count}, "
            f"Archived products: {archived_count}"
        )
