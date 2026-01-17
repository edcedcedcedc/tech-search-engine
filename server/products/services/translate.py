# products/services/translate.py
import os
import signal

import sys
import time
import builtins


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")
import django

django.setup()

from django.db import OperationalError, models
from products.models import Product
from products.utils.log.translation_log import translation_log

# =========================
# Block OpenAI import
# =========================
_real_import = builtins.__import__


def _block_openai_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name == "openai":
        fake_module = type(sys)("openai")

        class FakeOpenAI:
            def __init__(self, *args, **kwargs):
                pass

        fake_module.OpenAI = FakeOpenAI
        return fake_module
    return _real_import(name, globals, locals, fromlist, level)


builtins.__import__ = _block_openai_import


# =========================
# Main translation function
# =========================
def run_translation(
    shop_filter=None, db="default", force=False, skip_ru=False, skip_category=True
):

    # Import translator
    try:
        from googletrans import Translator
    except ImportError:
        translation_log(
            "ERROR: googletrans not installed! Please activate venv_translate"
        )
        return  # just return instead of exiting

    translator = Translator()
    STOP_TRANSLATION = False

    def signal_handler(sig, frame):
        nonlocal STOP_TRANSLATION
        translation_log("Received Ctrl+C, stopping gracefully")
        STOP_TRANSLATION = True

    signal.signal(signal.SIGINT, signal_handler)

    MAX_RETRIES = 3
    SLEEP_BETWEEN_REQUESTS = 1.0

    def normalize_text(text: str) -> str:
        return " ".join(str(text or "").strip().split())

    def translate_text(text: str, src: str, dest: str) -> str:
        if not text or not text.strip():
            return ""
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                translation_log(
                    f"Translating '{text[:50]}...' {src}->{dest} attempt {attempt}"
                )
                result = translator.translate(text, src=src, dest=dest)
                time.sleep(SLEEP_BETWEEN_REQUESTS)
                return normalize_text(result.text)
            except Exception as e:
                translation_log(f"Translation failed: {e} attempt={attempt}")
                time.sleep(2 * attempt)
        translation_log(
            f"Translation skipped after {MAX_RETRIES} attempts: '{text[:50]}...'"
        )
        return text

    # ====== Run translation ======
    qs = Product.objects.using(db).filter(change_type="created")
    if shop_filter:
        qs = qs.filter(shop__iexact=shop_filter)
    total = qs.count()
    if total == 0:
        translation_log("No products found")
        return

    # ===== Binary search to skip already translated products =====
    def is_translated(product: Product) -> bool:
        t_name = product.t_name or {}
        t_variant = product.t_variant or {}
        if product.name and t_name.get("en"):
            return True
        if product.variant and t_variant.get("en"):
            return True
        return False

    def binary_search_start(qs):
        """Return the ID of the first untranslated product"""
        min_id = qs.aggregate(min_id=models.Min("id"))["min_id"]
        max_id = qs.aggregate(max_id=models.Max("id"))["max_id"]
        if not min_id or not max_id:
            return None
        while min_id < max_id:
            mid = (min_id + max_id) // 2
            mid_product = qs.filter(id=mid).first()
            if not mid_product or is_translated(mid_product):
                min_id = mid + 1
            else:
                max_id = mid
        product = qs.filter(id=min_id).first()
        return min_id if product and not is_translated(product) else None

    start_id = binary_search_start(qs)
    if start_id:
        qs = qs.filter(id__gte=start_id)
        translation_log(f"Starting from product ID {start_id}")
    else:
        translation_log("All products already translated")
        return

    for idx, product in enumerate(qs.order_by("id"), 1):
        if STOP_TRANSLATION:
            translation_log(f"STOP requested at product {idx}/{qs.count()}")
            break

        t_name = product.t_name or {}
        t_variant = product.t_variant or {}

        # Skip already translated products unless force
        if is_translated(product) and not force:
            continue

        # Translate name
        if product.name and (force or not t_name.get("en")):
            t_name["en"] = translate_text(product.name, "ro", "en")
        if not skip_ru and t_name.get("en"):
            t_name["ru"] = translate_text(t_name["en"], "en", "ru")
        product.t_name = t_name

        # Translate variant
        if product.variant and (force or not t_variant.get("en")):
            t_variant["en"] = translate_text(product.variant, "ro", "en")
        if not skip_ru and t_variant.get("en"):
            t_variant["ru"] = translate_text(t_variant["en"], "en", "ru")
        product.t_variant = t_variant

        # Save product with retry
        MAX_DB_RETRIES = 5
        DB_RETRY_SLEEP = 60
        saved = False
        for attempt in range(MAX_DB_RETRIES):
            try:
                product.save(using=db, update_fields=["t_name", "t_variant"])
                saved = True
                break
            except OperationalError as e:
                translation_log(
                    f"DB error on product {product.id}: {e}, retry={attempt+1}"
                )
                time.sleep(DB_RETRY_SLEEP)
        if not saved:
            translation_log(f"FAILED to save product {product.id}")

        translation_log(f"Translated product {product.id} ({idx}/{qs.count()})")


# =========================
# CLI ENTRYPOINT
# =========================
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run product translation")
    parser.add_argument("--db", default="default")
    parser.add_argument("--shop-filter", dest="shop_filter", default=None)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--skip-ru", action="store_true")
    parser.add_argument("--skip-category", action="store_true")

    args = parser.parse_args()

    translation_log(f"Starting translation: db={args.db}, shop={args.shop_filter}")

    run_translation(
        db=args.db,
        shop_filter=args.shop_filter,
        force=False,
        skip_ru=False,
        skip_category=True,
    )
