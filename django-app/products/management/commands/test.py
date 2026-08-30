from django.core.management.base import BaseCommand
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Normalize smartphone category (RO only), mark dirty, and drop embeddings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many products would be updated without making changes",
        )

    def handle(self, *args, **options):
        is_dry_run = options["dry_run"]

        select_sql = """
        SELECT COUNT(*)
        FROM products_product
        WHERE json_extract(t_category, '$.ro') LIKE '%smartphone%';
        """

        update_sql = """
        UPDATE products_product
        SET
            t_category = '{
              "ro": "smartphone, telefon mobil",
              "en": "Smartphones",
              "ru": "смартфоны"
            }',
            dirty = 1,
            embedding = NULL
        WHERE
            json_extract(t_category, '$.ro') LIKE '%smartphone%';
        """

        with connection.cursor() as cursor:
            cursor.execute(select_sql)
            count = cursor.fetchone()[0]

        if is_dry_run:
            self.stdout.write(
                self.style.WARNING(f"DRY RUN: {count} products would be updated")
            )
            return

        if count == 0:
            self.stdout.write(
                self.style.NOTICE("No products matched. Nothing to update.")
            )
            return

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(update_sql)
                updated = cursor.rowcount

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {updated} products (category normalized, dirty set, embeddings cleared)"
            )
        )
