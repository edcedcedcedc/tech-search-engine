from django.db import transaction
from django.core.cache import cache
from products.models import SystemState

GLOBAL_SEARCH_VERSION_KEY = "global_search_version"


def get_global_system_version():
    obj, created = SystemState.objects.get_or_create(
        key=GLOBAL_SEARCH_VERSION_KEY,
        defaults={"value": "1"},
    )
    return int(obj.value)


@transaction.atomic
def bump_global_system_version():
    obj, created = SystemState.objects.select_for_update().get_or_create(
        key=GLOBAL_SEARCH_VERSION_KEY,
        defaults={"value": "1"},
    )

    new_version = int(obj.value) + 1
    obj.value = str(new_version)
    obj.save(update_fields=["value", "updated_at"])

    # ------------------- INVALIDATE CACHES -------------------
    cache.clear()

    # ------------------- INVALIDATE ALL SESSIONS -------------------
    from django.contrib.sessions.models import Session

    Session.objects.all().delete()

    return new_version
