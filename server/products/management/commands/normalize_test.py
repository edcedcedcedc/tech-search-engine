from django.core.management.base import BaseCommand
from products.models import Product
import json
from products.utils.log.category_log import category_log

DBS = ["enter", "darwin", "xstore", "default"]


class Command(BaseCommand):
    help = "Check that all products have normalized t_category with ro, en, ru"

    def handle(self, *args, **options):
        for db in DBS:
            missing_count = 0
            total_count = Product.objects.using(db).count()
            missing_products = []

            category_log(f"\nChecking DB '{db}' with {total_count} products...")

            for product in Product.objects.using(db).all():
                t_cat = getattr(product, "t_category", None)

                if not t_cat:
                    missing_count += 1
                    missing_products.append(
                        (product.id, getattr(product, "external_id", None))
                    )
                    continue

                # If t_category is stored as JSON string, parse it
                if isinstance(t_cat, str):
                    try:
                        t_cat = json.loads(t_cat)
                    except json.JSONDecodeError:
                        missing_count += 1
                        missing_products.append(
                            (product.id, getattr(product, "external_id", None))
                        )
                        continue

                # Check that ro, en, ru all exist and are non-empty
                if not all(k in t_cat and t_cat[k] for k in ["ro", "en", "ru"]):
                    missing_count += 1
                    missing_products.append(
                        (product.id, getattr(product, "external_id", None))
                    )

            if missing_count > 0:
                category_log(
                    f"DB '{db}': {missing_count} products missing t_category or ro/en/ru"
                )
                category_log("Products (id, external_id):")
                for pid, ext_id in missing_products:
                    category_log(f"  {pid} | {ext_id}")
            else:
                category_log(f"DB '{db}': All products normalized")
