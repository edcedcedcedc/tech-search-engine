from django.core.management.base import BaseCommand
from django.db.models import Q, Count
from products.models import ProductPriceHistory


class Command(BaseCommand):
    help = "Print two consecutive price history nodes for a tracked product or archived product"

    def handle(self, *args, **options):
        # Find a product or archived product with at least 2 history entries
        item = (
            ProductPriceHistory.objects.filter(
                Q(product__isnull=False) | Q(archived_product__isnull=False)
            )
            .values("product_id", "archived_product_id")
            .annotate(history_count=Count("id"))
            .filter(history_count__gte=2)
            .order_by("product_id", "archived_product_id")  # <-- FIX: add ordering
            .first()
        )

        if not item:
            self.stdout.write(
                self.style.WARNING(
                    "No product or archived product with 2+ history nodes found"
                )
            )
            return

        # Determine whether it's a product or archived product
        if item["product_id"]:
            nodes = ProductPriceHistory.objects.filter(
                product_id=item["product_id"]
            ).order_by("recorded_at")[:2]
            target_type = "Product"
            target_id = item["product_id"]
        else:
            nodes = ProductPriceHistory.objects.filter(
                archived_product_id=item["archived_product_id"]
            ).order_by("recorded_at")[:2]
            target_type = "ArchivedProduct"
            target_id = item["archived_product_id"]

        self.stdout.write(
            self.style.SUCCESS(
                f"Showing 2 history nodes for {target_type} id={target_id}"
            )
        )

        for node in nodes:
            product_url = (
                node.product.url
                if node.product
                else (node.archived_product.url if node.archived_product else "N/A")
            )
            print(
                f"ID: {node.id} | Product: {node.product} | Archived: {node.archived_product} | "
                f"Shop: {node.shop} | Price: {node.price} | In stock: {node.in_stock} | "
                f"Recorded at: {node.recorded_at} | URL: {product_url}"
            )
