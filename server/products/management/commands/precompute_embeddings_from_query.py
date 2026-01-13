# products/management/commands/precompute_query_similarity.py
from django.core.management.base import BaseCommand
from products.models import Product, UserQueryEmbedding, PrecomputedSimilarity
from openai import OpenAI
import json
import numpy as np
import time
import environ
import re
from products.utils.test_script_log import test_log

env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


class Command(BaseCommand):
    help = "Precompute query embeddings and cosine similarity vs products"

    def add_arguments(self, parser):
        parser.add_argument("--log-file", type=str, required=True)
        parser.add_argument("--batch-size", type=int, default=50)

    def handle(self, *args, **options):
        log_file = options["log_file"]
        batch_size = options["batch_size"]

        # Read user queries from log
        with open(log_file, "r", encoding="utf-8") as f:
            queries = [line.strip() for line in f if line.strip()]

        # Remove duplicates
        queries = list(set(queries))
        test_log(f"Found {len(queries)} unique queries in log")

        products = list(Product.objects.filter(embedding__isnull=False))
        test_log(f"Loaded {len(products)} products with embeddings")

        for i in range(0, len(queries), batch_size):
            batch_queries = queries[i : i + batch_size]
            for query_text in batch_queries:
                # Skip if already processed
                if UserQueryEmbedding.objects.filter(query_text=query_text).exists():
                    continue

                # Generate embedding
                resp = client.embeddings.create(
                    model="text-embedding-3-small", input=query_text
                )
                query_emb = resp.data[0].embedding

                uq = UserQueryEmbedding.objects.create(
                    query_text=query_text, embedding=json.dumps(query_emb)
                )

                # Compute similarity vs all products
                for p in products:
                    p_emb = np.array(json.loads(p.embedding))
                    sim = cosine_similarity(query_emb, p_emb)
                    PrecomputedSimilarity.objects.create(
                        user_query=uq, product=p, similarity=sim
                    )

                time.sleep(0.2)  # avoid rate limit

            test_log(f"Processed batch {i}-{i+len(batch_queries)}")
