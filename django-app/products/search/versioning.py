# products/search/versioning.py

from django.core.cache import cache

GLOBAL_SEARCH_VERSION_KEY = "global_search_version"


def get_global_search_version():
    version = cache.get(GLOBAL_SEARCH_VERSION_KEY)
    if version is None:
        version = 1
        cache.set(GLOBAL_SEARCH_VERSION_KEY, version, None)
    return version


def bump_global_search_version():
    version = get_global_search_version() + 1
    cache.set(GLOBAL_SEARCH_VERSION_KEY, version, None)
    return version
