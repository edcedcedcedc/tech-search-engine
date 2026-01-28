from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product
import json
from products.utils.log.category_log import category_log
from products.crawler.config import (
    BROKEN_DB,
    CRAWLER_DBS,
)


class Command(BaseCommand):
    help = "Check products with missing t_category or category and move them to a broken DB"

    def handle(self, *args, **options):
        for db in CRAWLER_DBS:
            missing_count = 0
            total_count = Product.objects.using(db).count()
            missing_products = []

            category_log(f"\nChecking DB '{db}' with {total_count} products...")

            for product in Product.objects.using(db).all():
                t_cat = getattr(product, "t_category", None)
                category_empty = not product.category or not product.category.strip()

                # Parse JSON string if needed
                if isinstance(t_cat, str):
                    try:
                        t_cat = json.loads(t_cat)
                    except json.JSONDecodeError:
                        t_cat = None

                # Check if t_category or category is missing/empty
                t_cat_invalid = not t_cat or not all(
                    k in t_cat and t_cat[k].strip() for k in ["ro", "en", "ru"]
                )

                if t_cat_invalid or category_empty:
                    missing_count += 1
                    missing_products.append((product.id, product.external_id))
                    category_log(f"DB '{db}': {missing_count} products moved...")
                    # --- Move product to broken DB ---
                    try:
                        with transaction.atomic(using=db):
                            # Create in broken DB
                            Product.objects.using(BROKEN_DB).create(
                                external_id=product.external_id,
                                similar_id=product.similar_id,
                                identical_id=product.identical_id,
                                name=product.name,
                                variant=product.variant,
                                embedding=product.embedding,
                                brand=product.brand,
                                category=product.category or "",
                                t_name=product.t_name or {},
                                t_variant=product.t_variant or {},
                                t_category=product.t_category or {},
                                url=product.url or "",
                                image=product.image or "",
                                price=product.price,
                                in_stock=product.in_stock,
                                shop=product.shop,
                                dirty=False,
                            )
                            # Delete from original DB
                            product.delete(using=db)

                    except Exception as e:
                        category_log(
                            f"ERROR moving product {product.id} ({product.external_id}) from '{db}' to '{BROKEN_DB}': {e}"
                        )

            if missing_count > 0:
                category_log(
                    f"DB '{db}': {missing_count} products moved to '{BROKEN_DB}' due to missing t_category or category"
                )
                category_log("Products (id, external_id):")
                for pid, ext_id in missing_products:
                    category_log(f"  {pid} | {ext_id}")
            else:
                category_log(f"DB '{db}': All products normalized")
