from django.core.management.base import BaseCommand
from products.models import Product
import time
import re
from googletrans import Translator

translator = Translator()


def normalize(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text.strip())
    text = re.sub(r'"\s*([^\s])', r'" \1', text)  # Ensure space after quote
    text = re.sub(r'(\d+)\s+"', r'\1"', text)  # Remove space before quote
    return text


def translate_text(text: str, target_lang: str, source_lang: str) -> str:
    if not text:
        return ""
    text = normalize(text)
    try:
        translated = translator.translate(text, src=source_lang, dest=target_lang)
        return normalize(translated.text)
    except Exception as e:
        print(f"Translation failed for '{text}' ({source_lang}->{target_lang}): {e}")
        return text


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
        sleep_time = options["sleep"]
        force = options["force"]

        qs = Product.objects.all()
        total = qs.count()
        print(f"Found {total} products")

        for idx, product in enumerate(qs.iterator(chunk_size=50), 1):
            product.t_name = product.t_name or {}
            product.t_variant = product.t_variant or {}

            # Always store Romanian original
            product.t_name["ro"] = normalize(product.name or "")
            product.t_variant["ro"] = normalize(product.variant or "")

            # RO -> EN
            if force or not product.t_name.get("en"):
                product.t_name["en"] = translate_text(product.name or "", "en", "ro")
            if force or not product.t_variant.get("en"):
                product.t_variant["en"] = translate_text(
                    product.variant or "", "en", "ro"
                )

            # EN -> RU
            if force or not product.t_name.get("ru"):
                product.t_name["ru"] = translate_text(product.t_name["en"], "ru", "en")
            if force or not product.t_variant.get("ru"):
                product.t_variant["ru"] = translate_text(
                    product.t_variant["en"], "ru", "en"
                )

            # Save
            product.save(update_fields=["t_name", "t_variant"])
            print(f"[{idx}/{total}] Translated {product.external_id}")

            time.sleep(sleep_time)

        print("Translation completed!")
