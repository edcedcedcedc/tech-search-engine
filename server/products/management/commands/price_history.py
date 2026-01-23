from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Max, Q

from products.models import (
    Product,
    ArchivedProduct,
    ArchivedBrokenProduct,
    ProductPriceHistory,
)
from products.utils.log.price_history_log import price_history_log


class Command(BaseCommand):
    help = "Create price history for ALL products (active + archived + broken) with daily snapshots"

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
        parser.add_argument(
            "--include-broken",
            action="store_true",
            help="Include broken (archived broken) products in history creation",
        )
        parser.add_argument(
            "--per-day",
            action="store_true",
            help="Force daily snapshot even if price/stock didn't change",
        )

    def handle(self, *args, **options):
        db = options["db"]
        include_archived = options["include_archived"]
        include_broken = options["include_broken"]
        force_daily = options["per-day"]

        now = timezone.now()
        today = now.date()

        price_history_log(f"[HISTORY] Starting price history for DB: {db}")
        price_history_log(f"[HISTORY] Include archived: {include_archived}")
        price_history_log(f"[HISTORY] Force daily snapshots: {force_daily}")

        total_created = 0
        total_skipped = 0
        to_create = []

        # ------------------------
        # 1. ACTIVE PRODUCTS
        # ------------------------
        price_history_log("[HISTORY] Processing active products...")

        latest_active = (
            ProductPriceHistory.objects.using(db)
            .filter(product__isnull=False)
            .order_by("product_id", "-recorded_at")
            .distinct("product_id")
        )
        latest_active_map = {h.product_id: h for h in latest_active}

        active_created = 0
        active_skipped = 0

        for product in (
            Product.objects.using(db).all().iterator(chunk_size=self.BATCH_SIZE)
        ):
            last = latest_active_map.get(product.id)
            create_new = False

            if not last:
                create_new = True
            else:
                last_date = last.recorded_at.date()
                if force_daily and last_date < today:
                    create_new = True
                elif last.price != product.price or last.in_stock != product.in_stock:
                    create_new = True

            if create_new:
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

            if len(to_create) >= self.BATCH_SIZE:
                ProductPriceHistory.objects.using(db).bulk_create(
                    to_create, batch_size=self.BATCH_SIZE
                )
                active_created += len(to_create)
                to_create.clear()

        if to_create:
            ProductPriceHistory.objects.using(db).bulk_create(
                to_create, batch_size=self.BATCH_SIZE
            )
            active_created += len(to_create)
            to_create.clear()

        total_created += active_created
        total_skipped += active_skipped
        price_history_log(
            f"[HISTORY] Active: Created {active_created}, Skipped {active_skipped}"
        )

        # ------------------------
        # 2. ARCHIVED PRODUCTS
        # ------------------------
        archived_created = 0
        archived_skipped = 0

        if include_archived:
            price_history_log("[HISTORY] Processing archived products...")

            latest_archived = (
                ProductPriceHistory.objects.using(db)
                .filter(archived_product__isnull=False)
                .order_by("archived_product_id", "-recorded_at")
                .distinct("archived_product_id")
            )
            latest_archived_map = {h.archived_product_id: h for h in latest_archived}

            for archived in (
                ArchivedProduct.objects.using(db)
                .all()
                .iterator(chunk_size=self.BATCH_SIZE)
            ):
                last = latest_archived_map.get(archived.id)
                create_new = False

                if not last:
                    create_new = True
                else:
                    last_date = last.recorded_at.date()
                    if force_daily and last_date < today:
                        create_new = True
                    elif (
                        last.price != archived.price
                        or last.in_stock != archived.in_stock
                    ):
                        create_new = True

                if create_new:
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

                if len(to_create) >= self.BATCH_SIZE:
                    ProductPriceHistory.objects.using(db).bulk_create(
                        to_create, batch_size=self.BATCH_SIZE
                    )
                    archived_created += len(to_create)
                    to_create.clear()

            if to_create:
                ProductPriceHistory.objects.using(db).bulk_create(
                    to_create, batch_size=self.BATCH_SIZE
                )
                archived_created += len(to_create)
                to_create.clear()

            total_created += archived_created
            total_skipped += archived_skipped
            price_history_log(
                f"[HISTORY] Archived: Created {archived_created}, Skipped {archived_skipped}"
            )

            # ------------------------
            # 2b. BROKEN PRODUCTS
            # ------------------------
            broken_created = 0
            broken_skipped = 0

            if include_broken:
                price_history_log("[HISTORY] Processing broken products...")

                latest_broken = (
                    ProductPriceHistory.objects.using(db)
                    .filter(archived_product__isnull=False)
                    .filter(archived_product__archivedbrokenproduct__isnull=False)
                    .order_by("archived_product_id", "-recorded_at")
                    .distinct("archived_product_id")
                )
                latest_broken_map = {h.archived_product_id: h for h in latest_broken}

                for broken in (
                    ArchivedBrokenProduct.objects.using(db)
                    .all()
                    .iterator(chunk_size=self.BATCH_SIZE)
                ):
                    last = latest_broken_map.get(broken.id)
                    create_new = False

                    if not last:
                        create_new = True
                    else:
                        last_date = last.recorded_at.date()
                        if force_daily and last_date < today:
                            create_new = True
                        elif (
                            last.price != broken.price
                            or last.in_stock != broken.in_stock
                        ):
                            create_new = True

                    if create_new:
                        to_create.append(
                            ProductPriceHistory(
                                product=None,
                                archived_product=broken,
                                shop=broken.shop,
                                price=broken.price,
                                in_stock=broken.in_stock,
                                recorded_at=now,
                            )
                        )
                    else:
                        broken_skipped += 1

                    if len(to_create) >= self.BATCH_SIZE:
                        ProductPriceHistory.objects.using(db).bulk_create(
                            to_create, batch_size=self.BATCH_SIZE
                        )
                        broken_created += len(to_create)
                        to_create.clear()

                if to_create:
                    ProductPriceHistory.objects.using(db).bulk_create(
                        to_create, batch_size=self.BATCH_SIZE
                    )
                    broken_created += len(to_create)
                    to_create.clear()

                total_created += broken_created
                total_skipped += broken_skipped
                price_history_log(
                    f"[HISTORY] Broken: Created {broken_created}, Skipped {broken_skipped}"
                )

        # ------------------------
        # 3. SUMMARY
        # ------------------------
        price_history_log(
            f"[HISTORY] COMPLETED: Total created: {total_created}, Total skipped: {total_skipped}"
        )
        price_history_log(
            f"[HISTORY] TOTALS: Active products: {Product.objects.using(db).count()}, "
            f"Archived products: {ArchivedProduct.objects.using(db).count() if include_archived else 0}, "
            f"Broken products: {ArchivedBrokenProduct.objects.using(db).count() if include_archived else 0}"
        )
