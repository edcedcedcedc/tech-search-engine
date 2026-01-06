# products/utils/logging_base.py
from django.utils import timezone
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
LOGS_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOGS_DIR, "translation.log")


def translation_log(msg: str):
    timestamp = timezone.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {msg}\n")
    except Exception as e:
        # Absolute last-resort fallback, never crashes commands
        print(f"Failed to write log {LOG_FILE}: {e}")
