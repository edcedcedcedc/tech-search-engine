from django.core.management.base import BaseCommand
from django.db import transaction, connections
from django.db.utils import OperationalError
from django.conf import settings
from products.models import Product


class Command(BaseCommand):
    help = "Mark all products dirty=False except for crawler databases (enter, darwin, xstore)"

    SKIP_DBS = {"enter", "darwin", "xstore"}

    def handle(self, *args, **options):
        for db_name in settings.DATABASES.keys():
            if db_name in self.SKIP_DBS:
                self.stdout.write(f"Skipping crawler DB: {db_name}")
                continue

            # Check if the products_product table exists
            try:
                cursor = connections[db_name].cursor()
                cursor.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='products_product';"
                )
                if not cursor.fetchone():
                    self.stdout.write(
                        f"Skipping {db_name}: products_product table does not exist"
                    )
                    continue
            except OperationalError as e:
                self.stdout.write(f"Skipping {db_name} due to DB error: {e}")
                continue

            # Safe update
            try:
                with transaction.atomic(using=db_name):
                    count = Product.objects.using(db_name).update(dirty=False)
                    self.stdout.write(
                        f"Marked {count} products dirty=False in {db_name}"
                    )
            except OperationalError as e:
                self.stdout.write(f"Failed to update {db_name}: {e}")
