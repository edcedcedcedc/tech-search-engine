from django.core.management.base import BaseCommand
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from products.utils.log.translation_log import translation_log
from products.utils.log.generate_embeddings_from_object_log import (
    generate_embeddings_from_object_log,
)
from products.models import (
    Product,
    ProductPriceHistory,
    ArchivedProduct,
    ArchivedBrokenProduct,
)


class Command(BaseCommand):
    help = (
        "Count all objects across databases. "
        "Optionally count out-of-stock items, missing translations, or embeddings."
    )

    ALL_DBS = ["xstore", "enter", "darwin", "stage", "default", "broken"]
    STOCK_DBS = ["xstore", "enter", "darwin"]

    def add_arguments(self, parser):
        parser.add_argument(
            "--in_stock",
            action="store_true",
            help="Count out-of-stock items across xstore, enter, darwin",
        )
        parser.add_argument(
            "--check_translations",
            action="store_true",
            help="Count products missing required t_name / t_variant translations",
        )
        parser.add_argument(
            "--check_embeddings",
            action="store_true",
            help="Count products missing embeddings across xstore, enter, darwin",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=5,
            help="How many sample items to print per DB (default: 5)",
        )

    def handle(self, *args, **options):
        limit = options["limit"]

        # -------------------------------
        # --in_stock MODE
        # -------------------------------
        if options["in_stock"]:
            shop_crawler_log("Counting OUT-OF-STOCK products...\n")
            total_out_of_stock = 0

            for db in self.STOCK_DBS:
                qs = Product.objects.using(db).filter(in_stock=False)
                count = qs.count()
                total_out_of_stock += count

                shop_crawler_log(f"[{db}] Out of stock products: {count}")

                for p in qs.only("name", "variant", "price", "url")[:limit]:
                    shop_crawler_log(
                        f"  - {p.name}"
                        f"{f' | {p.variant}' if p.variant else ''}"
                        f" | {p.price} | {p.url}"
                    )

                shop_crawler_log("")

            shop_crawler_log(
                f"TOTAL out of stock across {', '.join(self.STOCK_DBS)}: "
                f"{total_out_of_stock}\n"
            )
            return

        # -------------------------------
        # --check-translations MODE
        # -------------------------------
        if options["check_translations"]:
            translation_log("Checking missing translations...\n")

            for db in self.STOCK_DBS:
                missing = []

                for p in Product.objects.using(db).iterator():
                    if p.name:
                        if (
                            not p.t_name
                            or not p.t_name.get("ro")
                            or not p.t_name.get("en")
                        ):
                            missing.append(p)
                            continue

                    if p.variant:
                        if (
                            not p.t_variant
                            or not p.t_variant.get("ro")
                            or not p.t_variant.get("en")
                        ):
                            missing.append(p)

                translation_log(f"[{db}] Products missing translations: {len(missing)}")

                for p in missing[:limit]:
                    translation_log(
                        f"  - {p.name}"
                        f"{f' | {p.variant}' if p.variant else ''}"
                        f" | shop={p.shop}"
                    )

                translation_log("")

            translation_log("Translation check completed.")
            return

        # -------------------------------
        # --check-embeddings MODE
        # -------------------------------
        if options["check_embeddings"]:
            generate_embeddings_from_object_log("Checking missing embeddings...\n")

            total_missing = 0

            for db in self.STOCK_DBS:
                qs = Product.objects.using(db).filter(embedding__isnull=True)
                count = qs.count()
                total_missing += count

                generate_embeddings_from_object_log(
                    f"[{db}] Products missing embeddings: {count}"
                )

                for p in qs.only("name", "variant", "shop")[:limit]:
                    generate_embeddings_from_object_log(
                        f"  - {p.name}"
                        f"{f' | {p.variant}' if p.variant else ''}"
                        f" | shop={p.shop}"
                    )

                generate_embeddings_from_object_log("")

            generate_embeddings_from_object_log(
                f"TOTAL missing embeddings across {', '.join(self.STOCK_DBS)}: "
                f"{total_missing}\n"
            )
            return

        # -------------------------------
        # DEFAULT MODE
        # -------------------------------
        shop_crawler_log("Counting all objects across databases...\n")

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

            shop_crawler_log(f"[{db}] Products: {product_count}")
            shop_crawler_log(f"[{db}] ProductPriceHistory (active): {ph_active_count}")
            shop_crawler_log(
                f"[{db}] ProductPriceHistory (archived): {ph_archived_count}"
            )
            shop_crawler_log("")

        archived_count = ArchivedProduct.objects.using("default").count()
        broken_count = ArchivedBrokenProduct.objects.using("default").count()
        ph_archived_count = (
            ProductPriceHistory.objects.using("default")
            .filter(archived_product__isnull=False)
            .count()
        )

        shop_crawler_log(f"[default] ArchivedProduct: {archived_count}")
        shop_crawler_log(f"[default] ArchivedBrokenProduct: {broken_count}")
        shop_crawler_log(
            f"[default] ProductPriceHistory (archived/broken): " f"{ph_archived_count}"
        )

        shop_crawler_log("\nCounting completed.")
