from django.utils import timezone
import time
import random
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
LOGS_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOGS_DIR, "1shop_crawler_engine.log")


def shop_crawler_log(msg: str):
    """
    Logs a message to the aggregation_engine.log with timestamp.
    """
    timestamp = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {msg}\n")
    except Exception as e:
        print(f"Failed to write log: {e}")
