import random
import time
import json
import environ
import numpy as np

from numpy.linalg import norm
from openai import OpenAI
from django.db import transaction
from django.db.models import Q

from products.models import Product
from products.utils.log.generate_embeddings_from_object_log import (
    generate_embeddings_from_object_log,
)


class ProductEmbedding:
    """
    EXACT semantic equivalent of the original Django management command,
    refactored into a single Python class.

    NO logic changes.
    NO behavior changes.
    """

    def __init__(
        self,
        *,
        batch_size=500,
        retries=3,
        force=False,
        source="stage",
        dirty=False,
        model="text-embedding-3-small",
        dimensions=1536,
    ):
        self.batch_size = batch_size
        self.max_retries = retries
        self.force = force
        self.db = source
        self.dirty = dirty
        self.model = model
        self.dimensions = dimensions

        # Load environment variables (same semantics)
        env = environ.Env()
        environ.Env.read_env()
        self.client = OpenAI(api_key=env("OPENAI_API_KEY"))

    # ------------------------
    # Helper methods (unchanged logic)
    # ------------------------
    def cosine_sim(self, a, b):
        return np.dot(a, b) / (norm(a) * norm(b))

    def test_semantics(self, products, embeddings, texts, max_tests=2):
        if len(embeddings) < 2:
            return

        for _ in range(min(max_tests, len(embeddings) // 2)):
            idx1, idx2 = random.sample(range(len(embeddings)), 2)
            sim = self.cosine_sim(
                np.array(embeddings[idx1]),
                np.array(embeddings[idx2]),
            )
            generate_embeddings_from_object_log(
                f"Cosine similarity sample: {sim:.3f} "
                f"({texts[idx1][:50]} vs {texts[idx2][:50]})"
            )

    def prepare_text_for_embedding(self, product):
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

        texts = []

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

        combined = " ".join(texts)

        max_length = 8000
        if len(combined) > max_length:
            combined = combined[:max_length]

        return combined

    # ------------------------
    # Main execution (handle)
    # ------------------------
    def run(self):
        batch_size = self.batch_size
        max_retries = self.max_retries
        force = self.force
        db = self.db
        dirty = self.dirty
        model = self.model
        dimensions = self.dimensions

        total = 0

        if force:
            qs = Product.objects.using(db).all()
            total = qs.count()
        else:
            qs = (
                Product.objects.using(db)
                .filter(dirty=True)
                .filter(Q(embedding__isnull=True) | Q(embedding__exact=""))
            )
            total = qs.count()

        generate_embeddings_from_object_log(
            f"Found {total} products to process | "
            f"force={force} dirty_only={dirty} "
            f"batch_size={batch_size} model={model}"
        )

        products = list(qs)

        avg_text_length = 200
        estimated_tokens = (total * avg_text_length) / 4
        cost_per_1k = 0.00002 if model == "text-embedding-3-small" else 0.00013
        estimated_cost = (estimated_tokens / 1000) * cost_per_1k

        generate_embeddings_from_object_log(
            f"Estimated tokens: {estimated_tokens:,.0f} | "
            f"Estimated cost: ${estimated_cost:.4f}"
        )

        processed = 0

        for i in range(0, total, batch_size):
            batch = products[i : i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size

            generate_embeddings_from_object_log(
                f"Processing batch {batch_num}/{total_batches} "
                f"({len(batch)} products)"
            )

            for attempt in range(1, max_retries + 1):
                try:
                    texts = [self.prepare_text_for_embedding(p) for p in batch]

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

                    api_params = {
                        "model": model,
                        "input": valid_texts,
                    }

                    if dimensions and model in [
                        "text-embedding-3-small",
                        "text-embedding-3-large",
                    ]:
                        api_params["dimensions"] = dimensions

                    generate_embeddings_from_object_log(
                        f"Calling OpenAI API with {len(valid_texts)} texts "
                        f"(batch {batch_num})"
                    )

                    response = self.client.embeddings.create(**api_params)

                    embeddings = [item.embedding for item in response.data]

                    with transaction.atomic(using=db):
                        for product, emb in zip(valid_products, embeddings):
                            product.embedding = json.dumps(emb)
                            product.save(update_fields=["embedding"])

                    self.test_semantics(
                        valid_products,
                        embeddings,
                        valid_texts,
                        max_tests=2,
                    )

                    processed += len(valid_products)
                    generate_embeddings_from_object_log(
                        f"Batch {batch_num} completed: "
                        f"{processed}/{total} "
                        f"({processed/total*100:.1f}%)"
                    )

                    time.sleep(1)
                    break

                except Exception as e:
                    error_msg = str(e)
                    generate_embeddings_from_object_log(
                        f"Batch {batch_num} failed on attempt {attempt}: {error_msg}"
                    )

                    if "rate limit" in error_msg.lower():
                        wait_time = 2**attempt
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
                            f"Batch {batch_num} failed after "
                            f"{max_retries} retries. Skipping."
                        )
                        failed_ids = [p.id for p in batch]
                        with open(
                            f"failed_embeddings_batch_{batch_num}.json",
                            "w",
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
