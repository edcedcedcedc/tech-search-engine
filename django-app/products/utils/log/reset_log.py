import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
LOGS_DIR = os.path.join(BASE_DIR, "logs")


def reset_logs_dir():
    """
    Delete logs directory completely and recreate it.
    Intended to be called BEFORE pipeline / celery tasks start.
    """
    if os.path.exists(LOGS_DIR):
        shutil.rmtree(LOGS_DIR)

    os.makedirs(LOGS_DIR, exist_ok=True)
