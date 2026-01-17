from django.core.management.base import BaseCommand
from django.core.management import call_command
from products.utils.log.db_migrations_log import db_migrations_log


class Command(BaseCommand):
    help = "Run migrations on all configured databases"

    def handle(self, *args, **options):
        databases = ["default", "stage", "enter", "darwin", "xstore"]
        db_migrations_log(f"Running makemigrations...")
        call_command("makemigrations", interactive=False)
        for db in databases:
            db_migrations_log(f"Running migrations on '{db}' database...")
            call_command("migrate", database=db, interactive=False)
            db_migrations_log(f"Migrations applied for '{db}'")
