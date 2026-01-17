from django.core.management.base import BaseCommand
from products.models import Product
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


class Command(BaseCommand):
    help = (
        "Reset crawler databases (xstore, enter, darwin). Deletes all Product records."
    )

    CRAWLER_DBS = ["xstore", "enter", "darwin", "stage"]

    def handle(self, *args, **options):
        shop_crawler_log("Resetting crawler databases")
        shop_crawler_log("This will DELETE ALL products from:")
        for db in self.CRAWLER_DBS:
            shop_crawler_log(f"  - {db}")

        for db in self.CRAWLER_DBS:
            qs = Product.objects.using(db).all()
            count = qs.count()
            qs.delete()
            shop_crawler_log(f"[{db}] Deleted {count} products")

        shop_crawler_log("Crawler databases reset completed")
