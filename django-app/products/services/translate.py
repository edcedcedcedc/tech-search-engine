# products/services/translate.py
import os
import random
import signal
import sys
import time
import builtins
import argparse

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")
import django

django.setup()

from django.db import OperationalError
from products.models import Product
from products.utils.log.translation_log import translation_log


# =========================
# Parse command line arguments
# =========================
def parse_product_ids(product_ids_str):
    """Parse comma-separated product IDs string into list of integers"""
    if not product_ids_str:
        return []
    try:
        # Split by comma and convert to integers
        return [int(pid.strip()) for pid in product_ids_str.split(",") if pid.strip()]
    except ValueError as e:
        translation_log(f"Error parsing product IDs: {e}")
        return []


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
    shop_filter=None,
    db="default",
    force=False,
    skip_ru=True,
    skip_category=True,
    product_ids=None,
):
    """
    Translate products in the DB (optionally limited to product_ids)
    product_ids can be: None, a list of integers, or a comma-separated string
    """
    # Handle product_ids parameter - convert string to list if needed
    if isinstance(product_ids, str):
        product_ids = parse_product_ids(product_ids)

    try:
        from googletrans import Translator
    except ImportError:
        translation_log(
            "ERROR: googletrans not installed! Please activate venv_translate"
        )
        return

    translator = Translator()
    STOP_TRANSLATION = False

    def signal_handler(sig, frame):
        nonlocal STOP_TRANSLATION
        translation_log("Received Ctrl+C, stopping gracefully")
        STOP_TRANSLATION = True

    signal.signal(signal.SIGINT, signal_handler)

    MAX_RETRIES = 5
    SLEEP_BETWEEN_REQUESTS = 8

    def normalize_text(text: str) -> str:
        return " ".join(str(text or "").strip().split())

    def translate_text(text: str, src: str, dest: str) -> str:
        if not text or not text.strip():
            return ""
        times = 1
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                translation_log(
                    f"Translating '{text[:50]}...' {src}->{dest} attempt {attempt}"
                )
                result = translator.translate(text, src=src, dest=dest)
                # Safe sleep to avoid rate limits
                sleep_time = 2**times + SLEEP_BETWEEN_REQUESTS + random.uniform(0.5, 1)
                times += 1
                time.sleep(sleep_time)
                return normalize_text(result.text)
            except Exception as e:
                translation_log(f"Translation failed: {e}, attempt={attempt}")
                time.sleep(2 * attempt + random.uniform(0, 1))

        translation_log(
            f"Translation skipped after {MAX_RETRIES} attempts: '{text[:50]}...'"
        )
        return text

    # ===== Fetch products =====
    qs = Product.objects.using(db).filter(dirty=True)

    # Log what we're doing
    if product_ids and isinstance(product_ids, list) and len(product_ids) > 0:
        translation_log(
            f"Translating {len(product_ids)} explicit product IDs from DB '{db}'"
        )
        # Filter by the list of IDs
        qs = qs.filter(id__in=product_ids)
    else:
        translation_log(f"Translating all dirty products from DB '{db}'")

    total = qs.count()
    if total == 0:
        translation_log("No products found")
        return

    # ===== Check if product is translated =====
    def is_translated(product: Product) -> bool:
        t_name = product.t_name or {}
        t_variant = product.t_variant or {}
        if product.name:
            if not t_name.get("ro") or not t_name.get("en"):
                return False
        if product.variant:
            if not t_variant.get("ro") or not t_variant.get("en"):
                return False
        return True

    # ===== If no product_ids, find first untranslated product =====
    if not product_ids:
        start_id = None
        for product in qs.order_by("id"):
            if not is_translated(product):
                start_id = product.id
                break
        if start_id:
            qs = qs.filter(id__gte=start_id).order_by("id")
            translation_log(f"Starting from product ID {start_id}")
        else:
            translation_log("All products already translated")
            return
    else:
        qs = qs.order_by("id")  # preserve order for logging

    translation_log(f"Processing {qs.count()} products")

    # ===== Translate products =====
    for idx, product in enumerate(qs, 1):
        if STOP_TRANSLATION:
            translation_log(f"STOP requested at product {idx}/{qs.count()}")
            break

        t_name = product.t_name or {}
        t_variant = product.t_variant or {}

        if is_translated(product) and not force:
            translation_log(f"Skipping already translated product {product.id}")
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
        else:
            translation_log(f"Translated product {product.id} ({idx}/{qs.count()})")


# =========================
# Command line entry point
# =========================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Translate products")
    parser.add_argument("--db", default="default", help="Database to use")
    parser.add_argument("--product-ids", type=str, help="Comma-separated product IDs")
    parser.add_argument("--force", action="store_true", help="Force retranslation")
    parser.add_argument(
        "--skip-ru", action="store_true", default=True, help="Skip Russian translation"
    )
    parser.add_argument(
        "--skip-category",
        action="store_true",
        default=True,
        help="Skip category translation",
    )

    args = parser.parse_args()

    # Parse product IDs from command line
    product_ids_list = parse_product_ids(args.product_ids)

    # Run translation
    run_translation(
        db=args.db,
        force=args.force,
        skip_ru=True,
        skip_category=args.skip_category,
        product_ids=product_ids_list,
    )
