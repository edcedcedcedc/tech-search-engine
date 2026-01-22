# products/management/commands/reset_normalized_t_category.py
from django.core.management.base import BaseCommand
from products.models import Product
from django.db import transaction
from products.utils.log.category_log import category_log


class Command(BaseCommand):
    help = "Reset t_category to empty JSON for products already normalized"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default=None,
            help="Database to operate on (default: all databases)",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Number of products to update per batch",
        )

    def handle(self, *args, **options):
        dbs = (
            [options["db"]]
            if options["db"]
            else ["default", "darwin", "enter", "xstore"]
        )
        batch_size = options["batch_size"]

        for db in dbs:
            category_log(f"[RESET] Resetting t_category to empty in DB '{db}'")
            qs = Product.objects.using(db).filter(t_category__isnull=False)
            total = qs.count()
            category_log(f"[RESET] Found {total} products with t_category in DB '{db}'")

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
                            p.t_category = {"ro": "", "en": "", "ru": ""}
                        Product.objects.using(db).bulk_update(batch, ["t_category"])
                        updated_count += len(batch)
                except Exception as e:
                    category_log(
                        f"[RESET] Failed batch starting with ID {batch[0].id}: {e}"
                    )

            category_log(f"[RESET] Finished DB '{db}'. Total updated: {updated_count}")
