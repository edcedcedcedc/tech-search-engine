# products/utils.py
from django.core.cache import cache
from datetime import datetime, timedelta

MAX_OFFENSES = 3
BLOCK_BASE_TIME = 15 * 60


def handle_ip_offense(ip: str):
    key = f"ip_block:{ip}"
    data = cache.get(key) or {"offense_count": 0, "block_until": None}

    data["offense_count"] += 1
    if data["offense_count"] >= MAX_OFFENSES:
        data["block_until"] = datetime.now(datetime.timezone.utc) + timedelta(
            seconds=BLOCK_BASE_TIME
        )
        data["offense_count"] = 0

    cache.set(key, data, timeout=BLOCK_BASE_TIME)
