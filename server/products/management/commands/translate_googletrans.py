import signal
import time
import re
from django.core.management.base import BaseCommand
from django.db.utils import OperationalError
from products.models import Product
from products.utils.translation_log import translation_log
from products.utils.utils import normalize_translate
from googletrans import Translator

MAX_DB_RETRIES = 5
DB_RETRY_SLEEP = 60

translator = Translator()
STOP_TRANSLATION = False


def signal_handler(sig, frame):
    global STOP_TRANSLATION
    print("\nReceived Ctrl+C, stopping translation gracefully...")
    translation_log("INTERRUPTED by user (Ctrl+C)")
    STOP_TRANSLATION = True


signal.signal(signal.SIGINT, signal_handler)


def translate_text(text: str, target_lang: str, source_lang: str) -> str:
    if not text:
        return ""

    text = normalize_translate(text)

    try:
        translated = translator.translate(text, src=source_lang, dest=target_lang)
        return normalize_translate(translated.text)
    except Exception as e:
        translation_log(
            f"TRANSLATION FAILED ({source_lang}->{target_lang}) "
            f"text='{text}' error='{e}'"
        )
        return text  # safe fallback


class Command(BaseCommand):
    help = "Translate products using Google Translate: RO->EN and EN->RU"

    def add_arguments(self, parser):
        parser.add_argument("--sleep", type=float, default=0.5)
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force re-translation even if translation already exists",
        )

    def handle(self, *args, **options):
        global STOP_TRANSLATION

        sleep_time = options["sleep"]
        force = options["force"]

        BATCH_SIZE = 500
        total = Product.objects.count()

        # print(f"Found {total} products")
        translation_log(f"START translation run | products={total} force={force}")

        offset = 0
        idx = 0

        while True:
            qs = Product.objects.all().order_by("id")[offset : offset + BATCH_SIZE]

            if not qs.exists() or STOP_TRANSLATION:
                break

            for product in qs:
                idx += 1
                if STOP_TRANSLATION:
                    translation_log(f"STOP requested at product {idx}/{total}")
                    break

                translation_log(f"[{idx}/{total}] Translating {product.external_id}")

                product.t_name = product.t_name or {}
                product.t_variant = product.t_variant or {}

                product.t_name["ro"] = normalize_translate(product.name or "")
                product.t_variant["ro"] = normalize_translate(product.variant or "")

                if force or not product.t_name.get("en"):
                    product.t_name["en"] = translate_text(
                        product.name or "", "en", "ro"
                    )

                if force or not product.t_variant.get("en"):
                    product.t_variant["en"] = translate_text(
                        product.variant or "", "en", "ro"
                    )

                if force or not product.t_name.get("ru"):
                    product.t_name["ru"] = translate_text(
                        product.t_name["en"], "ru", "en"
                    )

                if force or not product.t_variant.get("ru"):
                    product.t_variant["ru"] = translate_text(
                        product.t_variant["en"], "ru", "en"
                    )

                saved = False
                for attempt in range(1, MAX_DB_RETRIES + 1):
                    try:
                        product.save(update_fields=["t_name", "t_variant"])
                        saved = True
                        break
                    except OperationalError as e:
                        if "database is locked" in str(e).lower():
                            translation_log(
                                f"DB LOCKED product={product.external_id} "
                                f"retry={attempt}/{MAX_DB_RETRIES}"
                            )
                            time.sleep(DB_RETRY_SLEEP)
                        else:
                            translation_log(
                                f"DB ERROR product={product.external_id} error={e}"
                            )
                            break

                if not saved:
                    translation_log(
                        f"FAILED SAVE product={product.external_id} after retries"
                    )
                    continue

                time.sleep(sleep_time)

            offset += BATCH_SIZE

        translation_log("END translation run")
        # print("Translation run finished gracefully!")
