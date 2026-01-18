from django.core.management.base import BaseCommand
from products.models import Product, ProductPriceHistory
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


class Command(BaseCommand):
    help = (
        "Reset crawler databases (xstore, enter, darwin). "
        "Deletes all Product records and optionally price history with --vector."
    )

    CRAWLER_DBS = ["xstore", "enter", "darwin", "stage"]

    def add_arguments(self, parser):
        parser.add_argument(
            "--history",
            action="store_true",
            help="Also delete all ProductPriceHistory rows",
        )

    def handle(self, *args, **options):
        delete_history = options.get("history", False)

        shop_crawler_log("Resetting crawler databases")
        shop_crawler_log("This will DELETE ALL products from:")
        for db in self.CRAWLER_DBS:
            shop_crawler_log(f"  - {db}")

        if delete_history:
            shop_crawler_log("Price history will also be deleted (--vector)")

        for db in self.CRAWLER_DBS:
            # Delete products
            qs = Product.objects.using(db).all()
            count = qs.count()
            qs.delete()
            shop_crawler_log(f"[{db}] Deleted {count} products")

            # Delete price history if --vector
            if delete_history:
                ph_qs = ProductPriceHistory.objects.using(db).all()
                ph_count = ph_qs.count()
                ph_qs.delete()
                shop_crawler_log(f"[{db}] Deleted {ph_count} price history rows")

        shop_crawler_log("Crawler databases reset completed")
