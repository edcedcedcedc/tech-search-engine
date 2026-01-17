from django.utils import timezone
import time
import random
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
LOGS_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOGS_DIR, "shop_crawler_engine.log")


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


def random_sleep(min_seconds: float = 2, max_seconds: float = 5, shop=None):
    """
    Sleeps a random duration and logs it to the same aggregation log file.
    """
    sleep_time = random.uniform(min_seconds, max_seconds)
    shop_crawler_log(f"Sleeping for {shop} {sleep_time:.1f}s to avoid hammering...")
    time.sleep(sleep_time)
