import json
from pathlib import Path
from threading import Lock
from collections import defaultdict
from django.utils import timezone

# ----- BASE PATHS -----
BASE_DIR = Path(__file__).resolve().parent  # server/products/services
DATA_DIR = BASE_DIR / "data"  # server/products/services/data
CATEGORY_AUDIT_FILE = DATA_DIR / "audit.json"
CATEGORY_AUDIT_BACKUP = DATA_DIR / "audit_backup.json"

# ----- CACHE -----
_cache = defaultdict(dict)
_lock = Lock()
_loaded = False


# ----- UTILS -----
def normalize_key(raw: str) -> str:
    """Normalize raw category to a lowercase stripped key."""
    return (raw or "").strip().lower()


# ----- LOAD / SAVE CACHE -----
def load_cache():
    """Load cache from file into memory (only once per process unless reset)."""
    global _loaded, _cache
    if _loaded:
        return
    with _lock:
        if CATEGORY_AUDIT_FILE.exists():
            _cache.update(json.loads(CATEGORY_AUDIT_FILE.read_text()))
        _loaded = True


def save_cache():
    """Save in-memory cache to disk (audit.json + backup)."""
    with _lock:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        data = {shop: dict(entries) for shop, entries in _cache.items()}
        CATEGORY_AUDIT_FILE.write_text(json.dumps(data, indent=2))
        CATEGORY_AUDIT_BACKUP.write_text(json.dumps(data, indent=2))


def reset_cache():
    """Clear in-memory cache and delete files (start fresh)."""
    global _cache, _loaded
    with _lock:
        _cache.clear()
        _loaded = False
        if CATEGORY_AUDIT_FILE.exists():
            CATEGORY_AUDIT_FILE.unlink()
        if CATEGORY_AUDIT_BACKUP.exists():
            CATEGORY_AUDIT_BACKUP.unlink()


# ----- GET / SET -----
def get_cached(shop: str, raw: str):
    """
    Return cache entry for given shop + raw category, or None.
    Important: does NOT create new keys.
    """
    load_cache()
    shop_dict = _cache.get(shop)
    if not shop_dict:
        return None
    return shop_dict.get(normalize_key(raw))


def set_cached(shop: str, original_category: str, normalized: dict, product_id: int):
    """
    Store normalized category in cache using the original raw category as key.
    Accumulate product IDs for that category.
    """
    load_cache()
    key = normalize_key(original_category)

    if shop not in _cache:
        _cache[shop] = {}

    # Get existing entry or create new
    entry = _cache[shop].get(key)
    if entry is None:
        entry = {
            "normalized": normalized,
            "first_seen": timezone.now().isoformat(),
            "examples": [],
        }
    else:
        # Only update normalized if changed
        entry["normalized"] = normalized
        entry.setdefault("first_seen", timezone.now().isoformat())

    # Accumulate product IDs
    if product_id not in entry["examples"]:
        entry["examples"].append(product_id)

    _cache[shop][key] = entry
    save_cache()
