from decimal import Decimal
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connections, transaction
from products.utils.log.db_migrations_log import db_migrations_log


class Command(BaseCommand):
    help = "Fix archived tables, convert price to Decimal, and run migrations on all databases for all tables"

    NOT_NULL_FIX_FIELDS = ["external_id", "name", "brand", "category"]
    MODELS_TO_FIX = ["products_archivedbrokenproduct", "products_archivedproduct"]
    PRICE_FIELDS = ["price"]

    def handle(self, *args, **options):
        # List of all databases
        databases = ["default", "stage", "enter", "darwin", "xstore"]

        # -----------------------------
        # Step 1: Fix NULLs and normalize prices
        # -----------------------------
        for db in databases:
            db_migrations_log(
                f"Fixing NULLs and price decimals in '{db}' database before migrations..."
            )
            self.fix_nulls_and_prices(db)

        # -----------------------------
        # Step 2: Make migrations (for all apps)
        # -----------------------------
        db_migrations_log("Running makemigrations for all apps...")
        call_command("makemigrations", interactive=False)
        db_migrations_log("Makemigrations completed.")

        # -----------------------------
        # Step 3: Apply migrations on all databases
        # -----------------------------
        for db in databases:
            db_migrations_log(f"Running migrate on '{db}' database for all tables...")
            call_command("migrate", database=db, interactive=False)
            db_migrations_log(f"Migrations applied for '{db}' database.")

        db_migrations_log("Database maintenance complete for all databases.")

    def fix_nulls_and_prices(self, db):
        """
        Replace NULLs with empty strings for NOT NULL fields
        and normalize price to decimal for ArchivedProduct and ArchivedBrokenProduct.
        """
        conn = connections[db]

        with conn.cursor() as cursor, transaction.atomic(using=db):
            for table in self.MODELS_TO_FIX:
                # Fix NULLs for NOT NULL fields
                for field in self.NOT_NULL_FIX_FIELDS:
                    sql = f"UPDATE {table} SET {field} = '' WHERE {field} IS NULL;"
                    cursor.execute(sql)
                    db_migrations_log(f" - Fixed NULLs in {table}.{field} for '{db}'")

                # Normalize prices to 2 decimal places
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
