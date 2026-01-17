# products/management/commands/backup.py
"""
How to use it

Backup Prod DB (default):

python manage.py backup
# → creates backups/default_backup_20260117_121212.sqlite3

Restore a backup into Prod DB:

python manage.py backup --restore backups/default_backup_20260117_121212.sqlite3

Restore into another DB (like Stage):

python manage.py backup --restore backups/default_backup_20260117_121212.sqlite3 --target-db=stage

"""


import os
import shutil
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from datetime import datetime

BASE_DIR = Path(settings.BASE_DIR)


class Command(BaseCommand):
    help = "Backup or restore the production database"

    def add_arguments(self, parser):
        parser.add_argument(
            "--restore",
            type=str,
            help="Path to backup file to restore into target database",
        )
        parser.add_argument(
            "--target-db",
            type=str,
            default="default",
            help="Database alias to restore into (default='default')",
        )

    def handle(self, *args, **options):
        backup_path = options.get("restore")
        target_db = options.get("target_db", "default")

        db_settings = settings.DATABASES.get(target_db)
        if not db_settings:
            self.stderr.write(f"Database alias '{target_db}' not found in settings")
            return

        db_file = db_settings.get("NAME")
        if not db_file:
            self.stderr.write(
                f"Database '{target_db}' does not use a file-based engine"
            )
            return

        db_file = Path(db_file)

        if backup_path:
            # RESTORE
            backup_file = Path(backup_path)
            if not backup_file.exists():
                self.stderr.write(f"Backup file '{backup_file}' does not exist")
                return

            shutil.copy2(backup_file, db_file)
            self.stdout.write(f"RESTORED '{backup_file}' → '{db_file}'")

        else:
            # BACKUP
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir = BASE_DIR / "backups"
            backup_dir.mkdir(exist_ok=True)
            backup_file = backup_dir / f"{target_db}_backup_{timestamp}.sqlite3"

            shutil.copy2(db_file, backup_file)
            self.stdout.write(f"BACKUP CREATED: {backup_file}")
