from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import (
    Product,
    ProductPriceHistory,
    ArchivedProduct,
    ArchivedBrokenProduct,
)
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


class Command(BaseCommand):
    help = (
        "Reset crawler databases and optionally reset t_category for archived products. "
        "Use --history to also delete price history. "
        "Use --all to also delete archived and broken products. "
        "Use --reset-t-category to reset t_category for ArchivedProduct and ArchivedBrokenProduct."
    )

    CRAWLER_DBS = ["xstore", "enter", "darwin", "stage", "default"]
    BATCH_SIZE = 500

    def add_arguments(self, parser):
        parser.add_argument(
            "--history",
            action="store_true",
            help="Also delete all ProductPriceHistory rows",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Also delete archived and broken products",
        )
        parser.add_argument(
            "--reset-t-category",
            action="store_true",
            help="Reset t_category for ArchivedProduct and ArchivedBrokenProduct",
        )

    def handle(self, *args, **options):
        delete_history = options.get("history", False)
        delete_all_extra = options.get("all", False)
        reset_t_category = options.get("reset_t_category", False)

        shop_crawler_log("Resetting crawler databases...")
        for db in self.CRAWLER_DBS:
            shop_crawler_log(f"  - {db}")

        if delete_history:
            shop_crawler_log("Price history will also be deleted (--history)")

        # Delete Products and optionally their price history
        for db in self.CRAWLER_DBS:
            qs = Product.objects.using(db).all()
            count = qs.count()
            qs.delete()
            shop_crawler_log(f"[{db}] Deleted {count} Product records")

            if delete_history:
                ph_qs = ProductPriceHistory.objects.using(db).filter(
                    product__isnull=False
                )
                ph_count = ph_qs.count()
                ph_qs.delete()
                shop_crawler_log(f"[{db}] Deleted {ph_count} ProductPriceHistory rows")

        # Delete archived/broken products if --all
        if delete_all_extra:
            shop_crawler_log("Also deleting archived and broken products (--all)")

            # ArchivedProduct
            archived_qs = ArchivedProduct.objects.using("default").all()
            archived_count = archived_qs.count()
            archived_qs.delete()
            shop_crawler_log(
                f"[default] Deleted {archived_count} ArchivedProduct records"
            )

            if delete_history:
                ph_archived = ProductPriceHistory.objects.using("default").filter(
                    archived_product__isnull=False
                )
                ph_archived_count = ph_archived.count()
                ph_archived.delete()
                shop_crawler_log(
                    f"[default] Deleted {ph_archived_count} price history rows for ArchivedProduct"
                )

            # ArchivedBrokenProduct
            broken_qs = ArchivedBrokenProduct.objects.using("default").all()
            broken_count = broken_qs.count()
            broken_qs.delete()
            shop_crawler_log(
                f"[default] Deleted {broken_count} ArchivedBrokenProduct records"
            )

            if delete_history:
                ph_broken = ProductPriceHistory.objects.using("default").filter(
                    archived_product__isnull=False
                )
                ph_broken_count = ph_broken.count()
                ph_broken.delete()
                shop_crawler_log(
                    f"[default] Deleted {ph_broken_count} price history rows for ArchivedBrokenProduct"
                )

        # Reset t_category for archived products if --reset-t-category
        if reset_t_category:
            shop_crawler_log(
                "Resetting t_category for ArchivedProduct and ArchivedBrokenProduct (--reset-t-category)"
            )

            # Reset ArchivedProduct
            total_archived = ArchivedProduct.objects.count()
            shop_crawler_log(f"[default] ArchivedProduct total: {total_archived}")
            for start in range(0, total_archived, self.BATCH_SIZE):
                batch = list(
                    ArchivedProduct.objects.all()[start : start + self.BATCH_SIZE]
                )
                with transaction.atomic():
                    for obj in batch:
                        obj.t_category = {}
                    ArchivedProduct.objects.bulk_update(batch, ["t_category"])
                shop_crawler_log(
                    f"[default] Processed ArchivedProduct {start + len(batch)}/{total_archived}"
                )

            # Reset ArchivedBrokenProduct
            total_broken = ArchivedBrokenProduct.objects.count()
            shop_crawler_log(f"[default] ArchivedBrokenProduct total: {total_broken}")
            for start in range(0, total_broken, self.BATCH_SIZE):
                batch = list(
                    ArchivedBrokenProduct.objects.all()[start : start + self.BATCH_SIZE]
                )
                with transaction.atomic():
                    for obj in batch:
                        obj.t_category = {}
                    ArchivedBrokenProduct.objects.bulk_update(batch, ["t_category"])
                shop_crawler_log(
                    f"[default] Processed ArchivedBrokenProduct {start + len(batch)}/{total_broken}"
                )

        shop_crawler_log("Crawler database reset completed.")
