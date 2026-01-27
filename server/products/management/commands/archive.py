# products/management/commands/archive_out_of_stock_zero_price.py

from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product, ArchivedProduct

BATCH_SIZE = 1000


class Command(BaseCommand):
    help = (
        "Archive products where in_stock=False and price=0, then delete "
        "from the specified DB (default=default)"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database to delete from (default=default, or stage)",
        )

    def handle(self, *args, **options):
        db_name = options["db"]
        total_archived = 0

        self.stdout.write(f"Archiving from DB: {db_name}")

        while True:
            qs = (
                Product.objects.using(db_name)
                .filter(in_stock=False, price=0)
                .order_by("id")[:BATCH_SIZE]
            )

            products = list(qs)
            if not products:
                break

            archived = [
                ArchivedProduct(
                    original_id=p.id,
                    external_id=p.external_id,
                    canonical_id=p.canonical_id,
                    name=p.name,
                    variant=p.variant,
                    price=p.price,
                    in_stock=p.in_stock,
                    shop=getattr(p, "shop", None),
                )
                for p in products
            ]

            with transaction.atomic(using=db_name):
                ArchivedProduct.objects.using(db_name).bulk_create(archived)
                Product.objects.using(db_name).filter(
                    id__in=[p.id for p in products]
                ).delete()

            total_archived += len(products)
            self.stdout.write(f"Archived {total_archived} products so far...")

        self.stdout.write(self.style.SUCCESS(f"Done. Total archived: {total_archived}"))
