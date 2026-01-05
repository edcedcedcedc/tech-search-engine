from django.core.management.base import BaseCommand
from products.models import Product
from googletrans import Translator
import time

"""
Usage:
python manage.py translate --batch 50 --sleep 1
"""

translator = Translator()


def translate_text(text: str, target_lang: str) -> str:
    """Translate a text to the target language. Fallbacks to original text."""
    if not text:
        return text
    try:
        translated = translator.translate(text, dest=target_lang)
        return translated.text
    except Exception as e:
        print(f"Translation failed for '{text}' -> {target_lang}: {e}")
        return text


class Command(BaseCommand):
    help = "Translate product name and variant from Romanian to EN/RU"

    def add_arguments(self, parser):
        parser.add_argument("--batch", type=int, default=50)
        parser.add_argument("--sleep", type=float, default=1.0)

    def handle(self, *args, **options):
        batch_size = options["batch"]
        sleep_time = options["sleep"]

        qs = Product.objects.all()
        total = qs.count()

        print(f"Found {total} products to translate")

        processed = 0

        for product in qs.iterator(chunk_size=batch_size):
            ro_name = product.name or ""
            ro_variant = product.variant or ""

            # Ensure dicts exist
            product.t_name = product.t_name or {}
            product.t_variant = product.t_variant or {}

            # Translate
            product.t_name["ro"] = ro_name
            product.t_name["en"] = translate_text(ro_name, "en")
            product.t_name["ru"] = translate_text(ro_name, "ru")

            product.t_variant["ro"] = ro_variant
            product.t_variant["en"] = translate_text(ro_variant, "en")
            product.t_variant["ru"] = translate_text(ro_variant, "ru")

            product.save(update_fields=["t_name", "t_variant"])

            processed += 1
            print(f"[{processed}/{total}] Translated {product.external_id}")

            time.sleep(sleep_time)

        print(f"Translation completed: {processed}/{total}")
