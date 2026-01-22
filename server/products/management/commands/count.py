from django.core.management.base import BaseCommand
from products.models import (
    Product,
    ProductPriceHistory,
    ArchivedProduct,
    ArchivedBrokenProduct,
)


class Command(BaseCommand):
    help = "Count all objects across crawler databases and default archived tables."

    CRAWLER_DBS = ["xstore", "enter", "darwin", "stage", "default"]

    def handle(self, *args, **options):
        self.stdout.write("Counting all objects across databases...\n")

        # Count Products and ProductPriceHistory in each DB
        for db in self.CRAWLER_DBS:
            product_count = Product.objects.using(db).count()
            ph_active_count = (
                ProductPriceHistory.objects.using(db)
                .filter(product__isnull=False)
                .count()
            )
            ph_archived_count = (
                ProductPriceHistory.objects.using(db)
                .filter(archived_product__isnull=False)
                .count()
            )

            self.stdout.write(f"[{db}] Products: {product_count}")
            self.stdout.write(f"[{db}] ProductPriceHistory (active): {ph_active_count}")
            self.stdout.write(
                f"[{db}] ProductPriceHistory (archived): {ph_archived_count}"
            )
            self.stdout.write("")

        # Count ArchivedProduct and ArchivedBrokenProduct in default DB
        archived_count = ArchivedProduct.objects.using("default").count()
        broken_count = ArchivedBrokenProduct.objects.using("default").count()
        ph_archived_count = (
            ProductPriceHistory.objects.using("default")
            .filter(archived_product__isnull=False)
            .count()
        )

        self.stdout.write("[default] ArchivedProduct: {}".format(archived_count))
        self.stdout.write("[default] ArchivedBrokenProduct: {}".format(broken_count))
        self.stdout.write(
            "[default] ProductPriceHistory (archived/broken): {}".format(
                ph_archived_count
            )
        )

        self.stdout.write("\nCounting completed.")
