from django.core.management.base import BaseCommand
from django.db import connections, transaction

BROKEN_DB = "broken"
TABLE = "products_product"

# Must match Product model EXACTLY
COLUMNS = {
    "similar_id": "VARCHAR(40)",
    "identical_id": "VARCHAR(40)",
    "variant": "VARCHAR(50)",
    "embedding": "TEXT",
    "t_name": "TEXT",
    "t_variant": "TEXT",
    "category": "TEXT",
    "t_category": "TEXT",
    "dirty": "BOOLEAN DEFAULT 0",
}


class Command(BaseCommand):
    help = "Fix broken DB schema to match Product model"

    def handle(self, *args, **options):
        conn = connections[BROKEN_DB]

        with conn.cursor() as cursor, transaction.atomic(using=BROKEN_DB):
            cursor.execute(f"PRAGMA table_info({TABLE});")
            existing = {row[1] for row in cursor.fetchall()}

            for col, sql_type in COLUMNS.items():
                if col not in existing:
                    cursor.execute(f"ALTER TABLE {TABLE} ADD COLUMN {col} {sql_type};")
                    self.stdout.write(self.style.SUCCESS(f"Added column: {col}"))

        self.stdout.write(self.style.SUCCESS("✅ broken DB schema fixed"))
