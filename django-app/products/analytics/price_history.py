from django.utils import timezone
from datetime import timedelta

from products.models import (
    Product,
    ArchivedProduct,
    ArchivedBrokenProduct,
    ProductPriceHistory,
)
from products.utils.log.price_history_log import price_history_log


class PriceHistoryBuilder:
    """
    Create price history for ALL products (active + archived + broken)
    with daily snapshots.
    """

    BATCH_SIZE = 1000

    def __init__(
        self,
        *,
        db="default",
        include_archived=False,
        include_broken=False,
        force_daily=False,
    ):
        self.db = db
        self.include_archived = include_archived
        self.include_broken = include_broken
        self.force_daily = force_daily

        self.today = timezone.now().date()
        self.base_time = timezone.now()

        self.total_created = 0
        self.total_skipped = 0
        self.to_create = []

    # ------------------------
    # ENTRY POINT
    # ------------------------
    def run(self):
        price_history_log(f"[HISTORY] Starting price history for DB: {self.db}")
        price_history_log(f"[HISTORY] Include archived: {self.include_archived}")
        price_history_log(f"[HISTORY] Force daily snapshots: {self.force_daily}")

        self._process_active_products()

        if self.include_archived:
            self._process_archived_products()

        if self.include_broken:
            self._process_broken_products()

        self._log_summary()

    # ------------------------
    # INTERNAL HELPERS
    # ------------------------
    def _flush_batch(self):
        if self.to_create:
            ProductPriceHistory.objects.using(self.db).bulk_create(
                self.to_create, batch_size=self.BATCH_SIZE
            )
            self.to_create.clear()

    def _unique_recorded_at(self):
        unique_microseconds = self.total_created % 1_000_000
        return self.base_time + timedelta(microseconds=unique_microseconds)

    # ------------------------
    # 1. ACTIVE PRODUCTS
    # ------------------------
    def _process_active_products(self):
        price_history_log("[HISTORY] Processing active products...")

        latest_active = (
            ProductPriceHistory.objects.using(self.db)
            .filter(product__isnull=False)
            .order_by("product_id", "-recorded_at")
        )

        latest_active_map = {}
        for h in latest_active.iterator(chunk_size=self.BATCH_SIZE):
            if h.product_id not in latest_active_map:
                latest_active_map[h.product_id] = h

        created = 0
        skipped = 0

        for product in (
            Product.objects.using(self.db).all().iterator(chunk_size=self.BATCH_SIZE)
        ):
            last = latest_active_map.get(product.id)
            create_new = False

            if not last:
                create_new = True
            else:
                last_date = last.recorded_at.date()
                if self.force_daily and last_date < self.today:
                    create_new = True
                elif last.price != product.price or last.in_stock != product.in_stock:
                    create_new = True

            if create_new:
                self.to_create.append(
                    ProductPriceHistory(
                        product=product,
                        archived_product=None,
                        archived_broken_product=None,
                        shop=product.shop,
                        price=product.price,
                        in_stock=product.in_stock,
                        recorded_at=self._unique_recorded_at(),
                    )
                )
                self.total_created += 1
            else:
                skipped += 1

            if len(self.to_create) >= self.BATCH_SIZE:
                self._flush_batch()
                created += self.BATCH_SIZE

        self._flush_batch()

        self.total_skipped += skipped
        price_history_log(f"[HISTORY] Active: Created {created}, Skipped {skipped}")

    # ------------------------
    # 2. ARCHIVED PRODUCTS
    # ------------------------
    def _process_archived_products(self):
        price_history_log("[HISTORY] Processing archived products...")

        latest_archived = (
            ProductPriceHistory.objects.using(self.db)
            .filter(archived_product__isnull=False)
            .order_by("archived_product_id", "-recorded_at")
        )

        latest_archived_map = {}
        for h in latest_archived.iterator(chunk_size=self.BATCH_SIZE):
            if h.archived_product_id not in latest_archived_map:
                latest_archived_map[h.archived_product_id] = h

        created = 0
        skipped = 0

        for archived in (
            ArchivedProduct.objects.using(self.db)
            .all()
            .iterator(chunk_size=self.BATCH_SIZE)
        ):
            last = latest_archived_map.get(archived.id)
            create_new = False

            if not last:
                create_new = True
            else:
                last_date = last.recorded_at.date()
                if self.force_daily and last_date < self.today:
                    create_new = True
                elif last.price != archived.price or last.in_stock != archived.in_stock:
                    create_new = True

            if create_new:
                self.to_create.append(
                    ProductPriceHistory(
                        product=None,
                        archived_product=archived,
                        archived_broken_product=None,
                        shop=archived.shop,
                        price=archived.price,
                        in_stock=archived.in_stock,
                        recorded_at=self._unique_recorded_at(),
                    )
                )
                self.total_created += 1
            else:
                skipped += 1

            if len(self.to_create) >= self.BATCH_SIZE:
                self._flush_batch()
                created += self.BATCH_SIZE

        self._flush_batch()

        self.total_skipped += skipped
        price_history_log(f"[HISTORY] Archived: Created {created}, Skipped {skipped}")

    # ------------------------
    # 2b. BROKEN PRODUCTS
    # ------------------------
    def _process_broken_products(self):
        price_history_log("[HISTORY] Processing broken products...")

        latest_broken = (
            ProductPriceHistory.objects.using(self.db)
            .filter(archived_broken_product__isnull=False)
            .order_by("archived_broken_product_id", "-recorded_at")
        )

        latest_broken_map = {}
        for h in latest_broken.iterator(chunk_size=self.BATCH_SIZE):
            if h.archived_broken_product_id not in latest_broken_map:
                latest_broken_map[h.archived_broken_product_id] = h

        created = 0
        skipped = 0

        for broken in (
            ArchivedBrokenProduct.objects.using(self.db)
            .all()
            .iterator(chunk_size=self.BATCH_SIZE)
        ):
            last = latest_broken_map.get(broken.id)
            create_new = False

            if not last:
                create_new = True
            else:
                last_date = last.recorded_at.date()
                if self.force_daily and last_date < self.today:
                    create_new = True
                elif last.price != broken.price or last.in_stock != broken.in_stock:
                    create_new = True

            if create_new:
                self.to_create.append(
                    ProductPriceHistory(
                        product=None,
                        archived_product=None,
                        archived_broken_product=broken,
                        shop=broken.shop,
                        price=broken.price,
                        in_stock=broken.in_stock,
                        recorded_at=self._unique_recorded_at(),
                    )
                )
                self.total_created += 1
            else:
                skipped += 1

            if len(self.to_create) >= self.BATCH_SIZE:
                self._flush_batch()
                created += self.BATCH_SIZE

        self._flush_batch()

        self.total_skipped += skipped
        price_history_log(f"[HISTORY] Broken: Created {created}, Skipped {skipped}")

    # ------------------------
    # 3. SUMMARY
    # ------------------------
    def _log_summary(self):
        price_history_log(
            f"[HISTORY] COMPLETED: Total created: {self.total_created}, "
            f"Total skipped: {self.total_skipped}"
        )
        price_history_log(
            f"[HISTORY] TOTALS: Active products: "
            f"{Product.objects.using(self.db).count()}, "
            f"Archived products: "
            f"{ArchivedProduct.objects.using(self.db).count() if self.include_archived else 0}, "
            f"Broken products: "
            f"{ArchivedBrokenProduct.objects.using(self.db).count() if self.include_broken else 0}"
        )
