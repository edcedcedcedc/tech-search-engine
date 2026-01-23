from decimal import Decimal
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connections, transaction
from products.utils.log.db_migrations_log import db_migrations_log


class Command(BaseCommand):
    help = "Fix archived tables, convert price to Decimal, and run migrations on all configured databases"

    NOT_NULL_FIX_FIELDS = ["external_id", "name", "brand", "category"]
    MODELS_TO_FIX = ["products_archivedbrokenproduct", "products_archivedproduct"]
    PRICE_FIELDS = ["price"]

    def handle(self, *args, **options):
        databases = ["default", "stage", "enter", "darwin", "xstore"]

        # Step 1: Fix NULLs and price decimals
        for db in databases:
            db_migrations_log(
                f"Fixing NULLs and price decimals in '{db}' database before migrations..."
            )
            self.fix_nulls_and_prices(db)

        # Step 2: Run makemigrations
        db_migrations_log("Running makemigrations...")
        call_command("makemigrations", interactive=False)

        # Step 3: Apply migrations on all databases
        for db in databases:
            db_migrations_log(f"Running migrations on '{db}' database...")
            call_command("migrate", database=db, interactive=False)
            db_migrations_log(f"Migrations applied for '{db}'")

    def fix_nulls_and_prices(self, db):
        """
        Replace NULLs with empty strings for NOT NULL fields
        and normalize price to Decimal for ArchivedProduct and ArchivedBrokenProduct.
        """
        conn = connections[db]

        with conn.cursor() as cursor, transaction.atomic(using=db):
            for table in self.MODELS_TO_FIX:
                # Fix NULLs
                for field in self.NOT_NULL_FIX_FIELDS:
                    sql = f"UPDATE {table} SET {field} = '' WHERE {field} IS NULL;"
                    cursor.execute(sql)
                    db_migrations_log(f" - Fixed NULLs in {table}.{field} for '{db}'")

                # Normalize prices to decimal with 2 decimal places
                for price_field in self.PRICE_FIELDS:
                    sql = f"""
                        UPDATE {table}
                        SET {price_field} = printf('%.2f', {price_field})
                        WHERE {price_field} IS NOT NULL;
                    """
                    cursor.execute(sql)
                    db_migrations_log(
                        f" - Normalized {table}.{price_field} to decimal for '{db}'"
                    )
