"""import random
from django.core.management.base import BaseCommand
from products.models import Product
from products.utils.generate_embeddings_from_object_log import (
    generate_embeddings_from_object_log,
)
import time
import environ
from openai import OpenAI
import json
import numpy as np
from numpy.linalg import norm

# Load environment variables
env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


def cosine_sim(a, b):
    return np.dot(a, b) / (norm(a) * norm(b))


def test_semantics(batch, embeddings, max_tests=2):

    if len(embeddings) < 2:
        return

    for _ in range(min(max_tests, len(embeddings) // 2)):
        idx1, idx2 = random.sample(range(len(embeddings)), 2)
        sim = cosine_sim(np.array(embeddings[idx1]), np.array(embeddings[idx2]))
        generate_embeddings_from_object_log(
            f"Cosine similarity sample: {sim:.3f} "
            f"({batch[idx1].t_name.get('en')} vs {batch[idx2].t_name.get('en')})"
        )


class Command(BaseCommand):
    help = "Generate embeddings for products"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size", type=int, default=20, help="Products per batch"
        )
        parser.add_argument("--retries", type=int, default=3, help="Retries per batch")
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate embeddings even if they already exist",
        )
        parser.add_argument("--source", type=str, help="Database", default="stage")
        parser.add_argument(
            "--dirty",
            action="store_true",
            help="Only process products marked dirty=True",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        max_retries = options["retries"]
        force = options["force"]
        db = options["source"]
        dirty = options.get("dirty", False)

        # Select products
        qs = Product.objects.using(db).all()

        if dirty:
            qs = qs.filter(dirty=True)

        if not force:
            qs = qs.filter(embedding__isnull=True)

        total = qs.count()

        generate_embeddings_from_object_log(
            f"Found {total} products to process | force={force} dirty_only={dirty}"
        )

        products = list(qs)

        for i in range(0, total, batch_size):
            batch = products[i : i + batch_size]

            for attempt in range(1, max_retries + 1):
                try:
                    texts = []
                    for p in batch:

                        t_name = (
                            p.t_name if isinstance(p.t_name, dict) else {"ro": p.name}
                        )
                        t_variant = (
                            p.t_variant
                            if isinstance(p.t_variant, dict)
                            else {"ro": p.variant}
                        )
                        t_category = (
                            p.t_category
                            if isinstance(p.t_category, dict)
                            else {"ro": p.category}
                        )

                        ro_text = " ".join(
                            filter(
                                None,
                                [
                                    t_name.get("ro"),
                                    t_variant.get("ro"),
                                    t_category.get("ro"),
                                    p.brand,
                                ],
                            )
                        )
                        ru_text = " ".join(
                            filter(
                                None,
                                [
                                    t_name.get("ru"),
                                    t_variant.get("ru"),
                                    t_category.get("ru"),
                                    p.brand,
                                ],
                            )
                        )
                        en_text = " ".join(
                            filter(
                                None,
                                [
                                    t_name.get("en"),
                                    t_variant.get("en"),
                                    t_category.get("en"),
                                    p.brand,
                                ],
                            )
                        )

                        combined_text = " ".join(
                            filter(None, [ro_text, ru_text, en_text])
                        )
                        texts.append(combined_text)

                    embeddings = []
                    for text in texts:
                        resp = client.embeddings.create(
                            model="text-embedding-3-small", input=text
                        )
                        emb = resp.data[0].embedding
                        embeddings.append(emb)
                        time.sleep(0.2)  # avoid rate limits

                    # Save embeddings
                    for p, emb in zip(batch, embeddings):
                        p.embedding = json.dumps(emb)
                        p.save(update_fields=["embedding"])

                    # Test semantics on a few samples
                    test_semantics(batch, embeddings, max_tests=2)

                    generate_embeddings_from_object_log(
                        f"Processed batch {i}-{i+len(batch)} successfully"
                    )
                    break

                except Exception as e:
                    generate_embeddings_from_object_log(
                        f"Batch {i}-{i+len(batch)} failed on attempt {attempt}: {e}"
                    )
                    time.sleep(5)
                    if attempt == max_retries:
                        generate_embeddings_from_object_log(
                            f"Batch {i}-{i+len(batch)} failed after {max_retries} retries. Skipping."
                        )



"""

import random
from django.core.management.base import BaseCommand
from products.models import Product
from products.utils.generate_embeddings_from_object_log import (
    generate_embeddings_from_object_log,
)
import time
import environ
from openai import OpenAI
import json
import numpy as np
from numpy.linalg import norm
from django.db import transaction

# Load environment variables
env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


def cosine_sim(a, b):
    return np.dot(a, b) / (norm(a) * norm(b))


def test_semantics(batch, embeddings, max_tests=2):
    if len(embeddings) < 2:
        return

    for _ in range(min(max_tests, len(embeddings) // 2)):
        idx1, idx2 = random.sample(range(len(embeddings)), 2)
        sim = cosine_sim(np.array(embeddings[idx1]), np.array(embeddings[idx2]))
        generate_embeddings_from_object_log(
            f"Cosine similarity sample: {sim:.3f} "
            f"({batch[idx1].t_name.get('en', '')[:30]} vs {batch[idx2].t_name.get('en', '')[:30]})"
        )


def prepare_text_for_embedding(product):
    """Prepare text from product for embedding - optimized version"""
    t_name = (
        product.t_name if isinstance(product.t_name, dict) else {"ro": product.name}
    )
    t_variant = (
        product.t_variant
        if isinstance(product.t_variant, dict)
        else {"ro": product.variant}
    )
    t_category = (
        product.t_category
        if isinstance(product.t_category, dict)
        else {"ro": product.category}
    )

    # Collect all available text in multiple languages
    texts = []

    # Romanian
    ro_parts = []
    if t_name.get("ro"):
        ro_parts.append(t_name["ro"])
    if t_variant.get("ro"):
        ro_parts.append(t_variant["ro"])
    if t_category.get("ro"):
        ro_parts.append(t_category["ro"])
    if product.brand:
        ro_parts.append(product.brand)
    if ro_parts:
        texts.append(" ".join(ro_parts))

    # English (most important for semantic search)
    en_parts = []
    if t_name.get("en"):
        en_parts.append(t_name["en"])
    if t_variant.get("en"):
        en_parts.append(t_variant["en"])
    if t_category.get("en"):
        en_parts.append(t_category["en"])
    if product.brand:
        en_parts.append(product.brand)
    if en_parts:
        texts.append(" ".join(en_parts))

    # Russian
    ru_parts = []
    if t_name.get("ru"):
        ru_parts.append(t_name["ru"])
    if t_variant.get("ru"):
        ru_parts.append(t_variant["ru"])
    if t_category.get("ru"):
        ru_parts.append(t_category["ru"])
    if product.brand:
        ru_parts.append(product.brand)
    if ru_parts:
        texts.append(" ".join(ru_parts))

    # Combine all language versions for richer embedding
    combined = " ".join(texts)

    # Truncate if too long (safety)
    max_length = 8000
    if len(combined) > max_length:
        combined = combined[:max_length]

    return combined


class Command(BaseCommand):
    help = "Generate embeddings for products using OpenAI"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size", type=int, default=500, help="Products per API call"
        )
        parser.add_argument("--retries", type=int, default=3, help="Retries per batch")
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate embeddings even if they already exist",
        )
        parser.add_argument("--source", type=str, help="Database", default="stage")
        parser.add_argument(
            "--dirty",
            action="store_true",
            help="Only process products marked dirty=True",
        )
        parser.add_argument(
            "--model",
            type=str,
            default="text-embedding-3-small",
            help="OpenAI embedding model to use",
        )
        parser.add_argument(
            "--dimensions",
            type=int,
            default=None,
            help="Dimensions for embedding (e.g., 512, 1536)",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        max_retries = options["retries"]
        force = options["force"]
        db = options["source"]
        dirty = options.get("dirty", False)
        model = options["model"]
        dimensions = options["dimensions"]

        # Select products
        qs = Product.objects.using(db).all()

        if dirty:
            qs = qs.filter(dirty=True)

        if not force:
            qs = qs.filter(embedding__isnull=True)

        total = qs.count()
        generate_embeddings_from_object_log(
            f"Found {total} products to process | force={force} dirty_only={dirty} batch_size={batch_size} model={model}"
        )

        products = list(qs)

        # Calculate expected cost
        avg_text_length = 200  # estimate
        estimated_tokens = (total * avg_text_length) / 4  # rough token count
        cost_per_1k = 0.00002 if model == "text-embedding-3-small" else 0.00013
        estimated_cost = (estimated_tokens / 1000) * cost_per_1k

        generate_embeddings_from_object_log(
            f"Estimated tokens: {estimated_tokens:,.0f} | Estimated cost: ${estimated_cost:.4f}"
        )

        processed = 0
        for i in range(0, total, batch_size):
            batch = products[i : i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size

            generate_embeddings_from_object_log(
                f"Processing batch {batch_num}/{total_batches} ({len(batch)} products)"
            )

            for attempt in range(1, max_retries + 1):
                try:
                    # Prepare all texts for the batch
                    texts = [prepare_text_for_embedding(p) for p in batch]

                    # Filter out empty texts
                    valid_indices = [
                        idx for idx, text in enumerate(texts) if text and text.strip()
                    ]
                    valid_texts = [texts[idx] for idx in valid_indices]
                    valid_products = [batch[idx] for idx in valid_indices]

                    if not valid_texts:
                        generate_embeddings_from_object_log(
                            f"Batch {batch_num} has no valid texts, skipping"
                        )
                        break

                    # Prepare API parameters
                    api_params = {
                        "model": model,
                        "input": valid_texts,
                    }

                    # Add dimensions if specified and model supports it
                    if dimensions and model in [
                        "text-embedding-3-small",
                        "text-embedding-3-large",
                    ]:
                        api_params["dimensions"] = dimensions

                    # Make SINGLE API call for the entire batch
                    generate_embeddings_from_object_log(
                        f"Calling OpenAI API with {len(valid_texts)} texts (batch {batch_num})"
                    )

                    response = client.embeddings.create(**api_params)

                    # Extract embeddings
                    embeddings = [item.embedding for item in response.data]

                    # Save embeddings
                    with transaction.atomic(using=db):
                        for product, emb in zip(valid_products, embeddings):
                            product.embedding = json.dumps(emb)
                            product.save(update_fields=["embedding"])

                    # Test semantics on a few samples
                    test_semantics(valid_products, embeddings, max_tests=2)

                    processed += len(valid_products)
                    generate_embeddings_from_object_log(
                        f"Batch {batch_num} completed: {processed}/{total} ({processed/total*100:.1f}%)"
                    )

                    # Rate limiting between batches (not between items!)
                    time.sleep(1)
                    break  # Success, exit retry loop

                except Exception as e:
                    error_msg = str(e)
                    generate_embeddings_from_object_log(
                        f"Batch {batch_num} failed on attempt {attempt}: {error_msg}"
                    )

                    if "rate limit" in error_msg.lower():
                        wait_time = 2**attempt  # Exponential backoff
                        generate_embeddings_from_object_log(
                            f"Rate limited, waiting {wait_time}s..."
                        )
                        time.sleep(wait_time)
                    elif attempt < max_retries:
                        wait_time = 5 * attempt
                        generate_embeddings_from_object_log(
                            f"Retrying in {wait_time}s..."
                        )
                        time.sleep(wait_time)
                    else:
                        generate_embeddings_from_object_log(
                            f"Batch {batch_num} failed after {max_retries} retries. Skipping."
                        )
                        # Save failed batch info
                        failed_ids = [p.id for p in batch]
                        with open(
                            f"failed_embeddings_batch_{batch_num}.json", "w"
                        ) as f:
                            json.dump(
                                {
                                    "batch_num": batch_num,
                                    "product_ids": failed_ids,
                                    "error": error_msg,
                                },
                                f,
                            )
                        break

        generate_embeddings_from_object_log(
            f"Completed! Processed {processed}/{total} products"
        )
