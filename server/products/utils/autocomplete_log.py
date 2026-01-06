from django.utils import timezone
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
LOGS_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
AUTOCOMPLETE_LOG_FILE = os.path.join(LOGS_DIR, "autocomplete.log")


def autocomplete_log(msg: str):
    """
    Logs messages specifically for the autocomplete endpoint.
    Each entry is timestamped.
    """
    timestamp = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with open(AUTOCOMPLETE_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {msg}\n")
    except Exception as e:
        print(f"Failed to write autocomplete log: {e}")
