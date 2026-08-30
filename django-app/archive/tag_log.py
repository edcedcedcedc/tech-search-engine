# products/utils/log/tag_log.py
import logging
from pathlib import Path
import os

# Create logs directory
LOG_DIR = Path(__file__).parent.parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Setup logger
logger = logging.getLogger("tag_generator")
logger.setLevel(logging.INFO)

# Clear existing handlers
if logger.handlers:
    logger.handlers.clear()

# File handler
try:
    file_handler = logging.FileHandler(LOG_DIR / "tag_generator.log", encoding="utf-8")
except:
    file_handler = logging.FileHandler(LOG_DIR / "tag_generator.log")

file_handler.setLevel(logging.INFO)

# Simple formatter
formatter = logging.Formatter("%(asctime)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
file_handler.setFormatter(formatter)

logger.addHandler(file_handler)


def tag_log(message: str, level: str = "info"):
    """Simple logging function."""
    try:
        if level.lower() == "error":
            logger.error(message)
        elif level.lower() == "warning":
            logger.warning(message)
        else:
            logger.info(message)
    except:
        # Fallback if logging fails
        print(f"[{level.upper()}] {message}")
