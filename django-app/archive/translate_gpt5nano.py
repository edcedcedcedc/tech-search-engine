from django.core.management.base import BaseCommand
from products.models import Product
import re
import time
import openai
import environ
import json

# Initialize environment variables
env = environ.Env()
environ.Env.read_env()

# Set your OpenAI API key
openai.api_key = env("OPEN_AI_KEY")


def normalize(text: str) -> str:
    """Clean up text for consistency."""
    if not text:
        return ""
    text = text.replace("\\", "").replace("//", "/")
    text = text.replace("'", "").replace("`", "")
    text = text.replace("“", '"').replace("”", '"')
    text = re.sub(r"\s*/\s*", "/", text)
    text = re.sub(r"(\d)\.\s+(\d)", r"\1.\2", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def translate_batch(
    texts: list[str], target_lang: str, source_lang: str = "ro"
) -> list[str]:
    """Translate a batch of texts using GPT-5 Nano."""
    if not texts:
        return []

    texts = [normalize(t) for t in texts]

    prompt = f"""
Translate the following list of product texts from {source_lang.upper()} to {target_lang.upper()}.
Preserve tech terms (like Full HD, 4K, IPS, LED, etc.), numbers, and model names.
Return the translations as a JSON array in the same order.

{json.dumps(texts, ensure_ascii=False)}
"""

    try:
        response = openai.chat.completions.create(
            model="gpt-5-nano",
            messages=[{"role": "user", "content": prompt}],
            timeout=20,  # Adjust timeout as needed
        )
        translated_text = response.choices[0].message.content.strip()
        # Parse JSON safely
        translations = json.loads(translated_text)
        return [normalize(t) for t in translations]
    except Exception as e:
        print(f"Batch translation failed -> {target_lang}: {e}")
        # Fallback: return originals
        return texts


class Command(BaseCommand):
    help = "Translate product name and variant from Romanian to other languages using GPT-5 Nano"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch", type=int, default=20, help="Number of products per batch"
        )
        parser.add_argument(
            "--sleep", type=float, default=0.5, help="Sleep between batches"
        )
        parser.add_argument(
            "--langs",
            type=str,
            default="en,ru",
            help="Comma-separated target languages",
        )

    def handle(self, *args, **options):
        batch_size = options["batch"]
        sleep_time = options["sleep"]
        target_langs = [l.strip() for l in options["langs"].split(",")]

        qs = Product.objects.all()
        total = qs.count()
        print(f"Found {total} products to translate")

        processed = 0
        batch = []

        for product in qs.iterator(chunk_size=batch_size):
            batch.append(product)
            if len(batch) >= batch_size:
                self.process_batch(batch, target_langs)
                processed += len(batch)
                print(f"[{processed}/{total}] Products translated")
                batch.clear()
                time.sleep(sleep_time)

        # Process remaining products
        if batch:
            self.process_batch(batch, target_langs)
            processed += len(batch)
            print(f"[{processed}/{total}] Products translated")

        print(f"Translation completed: {processed}/{total}")

    def process_batch(self, products, target_langs):
        ro_names = [p.name or "" for p in products]
        ro_variants = [p.variant or "" for p in products]

        for lang in target_langs:
            translated_names = translate_batch(ro_names, lang)
            translated_variants = translate_batch(ro_variants, lang)

            for p, t_name, t_var in zip(
                products, translated_names, translated_variants
            ):
                p.t_name = p.t_name or {}
                p.t_variant = p.t_variant or {}
                # Keep original Romanian
                p.t_name["ro"] = p.name or ""
                p.t_variant["ro"] = p.variant or ""
                p.t_name[lang] = t_name
                p.t_variant[lang] = t_var
                p.save(update_fields=["t_name", "t_variant"])
