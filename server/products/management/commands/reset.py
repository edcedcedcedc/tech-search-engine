from django.core.management.base import BaseCommand
from products.models import Product


class Command(BaseCommand):
    help = (
        "Reset crawler databases (xstore, enter, darwin). Deletes all Product records."
    )

    CRAWLER_DBS = ["xstore", "enter", "darwin"]

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("⚠️  Resetting crawler databases"))
        self.stdout.write("This will DELETE ALL products from:")
        for db in self.CRAWLER_DBS:
            self.stdout.write(f"  - {db}")

        for db in self.CRAWLER_DBS:
            qs = Product.objects.using(db).all()
            count = qs.count()
            qs.delete()
            self.stdout.write(self.style.SUCCESS(f"[{db}] Deleted {count} products"))

        self.stdout.write(self.style.SUCCESS("Crawler databases reset completed"))
