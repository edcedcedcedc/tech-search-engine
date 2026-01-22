# products/management/commands/populate_t_category.py
from django.core.management.base import BaseCommand
from products.models import Product
from django.db import transaction
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


class Command(BaseCommand):
    help = "Populate t_category field on all products across all databases with empty ro/en/ru"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Number of products to update per batch",
        )

    def handle(self, *args, **options):
        dbs = ["default", "darwin", "enter", "xstore"]
        batch_size = options["batch_size"]
        empty_t_category = {"ro": "", "en": "", "ru": ""}

        for db in dbs:
            shop_crawler_log(f"Populating t_category for all products in DB '{db}'")
            qs = Product.objects.using(db).all().order_by("id")
            total = qs.count()
            shop_crawler_log(f"Found {total} products in DB '{db}'")

            updated_count = 0
            start = 0

            while start < total:
                batch = list(qs[start : start + batch_size])
                start += batch_size

                if not batch:
                    continue

                try:
                    with transaction.atomic(using=db):
                        for p in batch:
                            p.t_category = empty_t_category
                        Product.objects.using(db).bulk_update(batch, ["t_category"])
                        updated_count += len(batch)
                except Exception as e:
                    shop_crawler_log(
                        f"Failed to update batch starting with id {batch[0].id}: {e}"
                    )

            shop_crawler_log(
                f"Finished populating t_category in DB '{db}'. Total updated: {updated_count}"
            )
