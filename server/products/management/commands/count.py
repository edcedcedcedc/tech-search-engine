from django.core.management.base import BaseCommand
from products.models import (
    Product,
    ProductPriceHistory,
    ArchivedProduct,
    ArchivedBrokenProduct,
)


class Command(BaseCommand):
    help = "Count all objects across databases. Optionally count out-of-stock items."

    ALL_DBS = ["xstore", "enter", "darwin", "stage", "default", "broken"]
    STOCK_DBS = ["xstore", "enter", "darwin"]

    def add_arguments(self, parser):
        parser.add_argument(
            "--in_stock",
            action="store_true",
            help="Count out-of-stock items across xstore, enter, darwin",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=5,
            help="How many out-of-stock items to print per DB (default: 5)",
        )

    def handle(self, *args, **options):
        # -------------------------------
        # --in_stock MODE
        # -------------------------------
        if options["in_stock"]:
            limit = options["limit"]
            self.stdout.write("Counting OUT-OF-STOCK products...\n")

            total_out_of_stock = 0

            for db in self.STOCK_DBS:
                qs = Product.objects.using(db).filter(in_stock=False)
                count = qs.count()
                total_out_of_stock += count

                self.stdout.write(f"[{db}] Out of stock products: {count}")

                if count > 0:
                    self.stdout.write(f"[{db}] Sample items:")
                    for p in qs.only("name", "variant", "price", "url")[:limit]:
                        self.stdout.write(
                            f"  - {p.name}"
                            f"{f' | {p.variant}' if p.variant else ''}"
                            f" | {p.price} | {p.url}"
                        )

                self.stdout.write("")

            self.stdout.write(
                f"TOTAL out of stock across {', '.join(self.STOCK_DBS)}: {total_out_of_stock}\n"
            )
            return

        # -------------------------------
        # DEFAULT MODE (existing behavior)
        # -------------------------------
        self.stdout.write("Counting all objects across databases...\n")

        for db in self.ALL_DBS:
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

        archived_count = ArchivedProduct.objects.using("default").count()
        broken_count = ArchivedBrokenProduct.objects.using("default").count()
        ph_archived_count = (
            ProductPriceHistory.objects.using("default")
            .filter(archived_product__isnull=False)
            .count()
        )

        self.stdout.write(f"[default] ArchivedProduct: {archived_count}")
        self.stdout.write(f"[default] ArchivedBrokenProduct: {broken_count}")
        self.stdout.write(
            f"[default] ProductPriceHistory (archived/broken): {ph_archived_count}"
        )

        self.stdout.write("\nCounting completed.")
