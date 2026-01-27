# products/management/commands/sync_stage_db.py

from django.core.management.base import BaseCommand
from products.models import Product, CategoryMapping
from products.utils.shop_crawler_engine_log import shop_crawler_log
from products.utils.generate_canonical_id import generate_canonical_id  # if used
from products.utils.embedding_utils import (
    generate_embedding,
)  # your embedding generator
from django.db import transaction
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = "Normalize shop DBs and merge new/updated products into stage DB"

    def add_arguments(self, parser):
        parser.add_argument(
            "--delta-days",
            type=int,
            default=14,
            help="Number of days to look back for new/updated products",
        )

    def handle(self, *args, **options):
        shops = ["enter", "darwin", "xstore"]
        delta_days = options["delta_days"]
        shop_crawler_log(f"START sync_stage_db command | delta_days={delta_days}")

        for shop in shops:
            self.process_shop(shop, delta_days)

        shop_crawler_log("END sync_stage_db command")

    def process_shop(self, shop, delta_days):
        """Process new or updated products in a given shop DB"""
        cutoff_time = timezone.now() - timedelta(days=delta_days)

        # Fetch created products
        created_products = Product.objects.using(shop).filter(
            created_at__gte=cutoff_time
        )

        # Fetch updated products (exclude newly created)
        updated_products = (
            Product.objects.using(shop)
            .filter(updated_at__gte=cutoff_time)
            .exclude(id__in=created_products.values_list("id", flat=True))
        )

        shop_crawler_log(
            f"Shop {shop} | {created_products.count()} created, "
            f"{updated_products.count()} updated since {cutoff_time}"
        )

        # Process created products
        for product in created_products:
            try:
                self.fix_product(product)
                self.generate_embeddings(product)
                self.merge_into_stage(product)
            except Exception as e:
                shop_crawler_log(
                    f"Error processing created product ID {product.id}: {e}"
                )

        # Process updated products
        for product in updated_products:
            try:
                self.merge_into_stage(product)
            except Exception as e:
                shop_crawler_log(
                    f"Error processing updated product ID {product.id}: {e}"
                )

    def fix_product(self, product):
        """Normalize category, translations, and other missing fields"""
        # Map raw category to unified category

    def generate_embeddings(self, product):
        """Generate embedding for product name + variant"""
        try:
            text_to_embed = f"{product.name} {product.variant or ''}"
            product.embedding = generate_embedding(text_to_embed)
        except Exception as e:
            shop_crawler_log(
                f"Error generating embedding for product ID {product.id}: {e}"
            )

    @transaction.atomic
    def merge_into_stage(self, product):
        """Upsert product into stage DB"""
        try:
            stage_product, created = Product.objects.using("stage").update_or_create(
                shop=product.shop,
                external_id=product.external_id,
                defaults={
                    "name": product.name,
                    "variant": product.variant,
                    "t_name": product.t_name,
                    "t_variant": product.t_variant,
                    "t_category": product.t_category,
                    "category": product.category,
                    "price": product.price,
                    "brand": product.brand,
                    "url": product.url,
                    "image": product.image,
                    "in_stock": product.in_stock,
                    "canonical_id": product.canonical_id,
                    "embedding": product.embedding,
                },
            )
            if created:
                shop_crawler_log(f"Inserted product ID {product.id} into stage DB")
            else:
                shop_crawler_log(f"Updated product ID {product.id} in stage DB")
        except Exception as e:
            shop_crawler_log(
                f"Error merging product ID {product.id} into stage DB: {e}"
            )
