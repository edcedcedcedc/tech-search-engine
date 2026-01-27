# products/management/commands/check_archived_oos.py
from django.core.management.base import BaseCommand
from products.models import ArchivedProduct, ArchivedBrokenProduct
from products.utils.log.db_inspect_products_log import db_inspect_products_log


class Command(BaseCommand):
    help = "Check that all items in ArchivedProduct and ArchivedBrokenProduct are out of stock"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database alias to use (default: 'default')",
        )

    def handle(self, *args, **options):
        db = options["db"]

        db_inspect_products_log(f"Checking ArchivedProduct in_stock in DB '{db}'")
        total_archived = ArchivedProduct.objects.using(db).count()
        oos_count_archived = (
            ArchivedProduct.objects.using(db).filter(in_stock=False).count()
        )
        in_stock_count_archived = total_archived - oos_count_archived

        db_inspect_products_log(f"Total ArchivedProduct: {total_archived}")
        db_inspect_products_log(f"Out-of-stock ArchivedProduct: {oos_count_archived}")
        db_inspect_products_log(
            f"Still in-stock ArchivedProduct: {in_stock_count_archived}"
        )

        db_inspect_products_log(f"Checking ArchivedBrokenProduct in_stock in DB '{db}'")
        total_broken = ArchivedBrokenProduct.objects.using(db).count()
        oos_count_broken = (
            ArchivedBrokenProduct.objects.using(db).filter(in_stock=False).count()
        )
        in_stock_count_broken = total_broken - oos_count_broken

        db_inspect_products_log(f"Total ArchivedBrokenProduct: {total_broken}")
        db_inspect_products_log(
            f"Out-of-stock ArchivedBrokenProduct: {oos_count_broken}"
        )
        db_inspect_products_log(
            f"Still in-stock ArchivedBrokenProduct: {in_stock_count_broken}"
        )

        if in_stock_count_archived == 0 and in_stock_count_broken == 0:
            db_inspect_products_log(
                "✅ All archived items are correctly marked as out-of-stock."
            )
        else:
            db_inspect_products_log(
                "⚠️ Some archived items are incorrectly marked as in-stock. Investigate!"
            )
