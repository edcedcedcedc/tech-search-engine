import os
from django.core.management.base import BaseCommand
from django.conf import settings
import shutil
from datetime import datetime

BACKUP_FOLDER = os.path.join(settings.BASE_DIR, "backups")
BACKUP_FILE_NAME = "default_backup_20260117_175002.sqlite3"
DEFAULT_DB_PATH = settings.DATABASES["default"]["NAME"]


class Command(BaseCommand):
    help = "Force replace the default SQLite DB with a backup"

    def handle(self, *args, **options):
        backup_path = os.path.join(BACKUP_FOLDER, BACKUP_FILE_NAME)

        if not os.path.exists(backup_path):
            self.stdout.write(self.style.ERROR(f"Backup not found: {backup_path}"))
            return

        # Backup current default DB just in case
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_now = os.path.join(
            BACKUP_FOLDER, f"default_backup_before_inject_{timestamp}.sqlite3"
        )
        shutil.copy2(DEFAULT_DB_PATH, backup_now)
        self.stdout.write(
            self.style.WARNING(f"Current default DB backed up to {backup_now}")
        )

        # Replace default DB with backup
        shutil.copy2(backup_path, DEFAULT_DB_PATH)
        self.stdout.write(self.style.SUCCESS(f"Default DB replaced with {backup_path}"))
