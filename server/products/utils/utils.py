# products/utils.py
from django.core.cache import cache
from datetime import datetime, timedelta
from rest_framework.response import Response
from functools import wraps
from django.utils import timezone

MAX_OFFENSES = 3
BLOCK_BASE_TIME = 15 * 60


def handle_ip_offense(ip: str):
    key = f"ip_block:{ip}"
    data = cache.get(key) or {"offense_count": 0, "block_until": None}

    now = timezone.now()

    # Reset offense count if previous block expired
    if data.get("block_until") and data["block_until"] < now:
        data["offense_count"] = 0
        data["block_until"] = None

    data["offense_count"] += 1

    if data["offense_count"] >= MAX_OFFENSES:
        data["block_until"] = now + timedelta(seconds=BLOCK_BASE_TIME)
        data["offense_count"] = 0

    cache.set(key, data, timeout=BLOCK_BASE_TIME)


def require_valid_session(view_func):
    @wraps(view_func)
    def wrapper(view, request, *args, **kwargs):
        if not request.session.session_key or not request.session.get(
            "aggregated_cache"
        ):
            return Response({"error": "invalid session"}, status=403)
        return view_func(view, request, *args, **kwargs)

    return wrapper
