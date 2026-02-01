import time
from products.models import Product
from products.utils.log.search_engine_log import search_engine_log
import json
import numpy as np
from products.models import UserQueryEmbedding
from openai import OpenAI
import environ
from products.utils import embeddings_cache
from unidecode import unidecode
import numpy as np

env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


def semantic_filter_products(query_embedding, top_n=500):
    """Retrieve top products by cosine similarity using preloaded embeddings.
    Only considers in-stock products to prevent polluting top results.
    """

    waited = 0
    while embeddings_cache.PRODUCT_EMBEDDINGS is None and waited < 5:
        time.sleep(0.1)
        waited += 0.1

    if (
        embeddings_cache.PRODUCT_EMBEDDINGS is None
        or embeddings_cache.PRODUCT_IDS is None
    ):
        search_engine_log("Warning: embedding cache not loaded yet!")
        return []

    query_vec = np.array(query_embedding, dtype=np.float32)
    query_norm = np.linalg.norm(query_vec)
    search_engine_log(f"Query vector norm: {query_norm}")

    # --- Step 1: Filter to in-stock IDs only ---
    in_stock_ids = set(
        Product.objects.filter(in_stock=True).values_list("id", flat=True)
    )
    in_stock_mask = np.isin(embeddings_cache.PRODUCT_IDS, list(in_stock_ids))

    filtered_embeddings = embeddings_cache.PRODUCT_EMBEDDINGS[in_stock_mask]
    filtered_ids = embeddings_cache.PRODUCT_IDS[in_stock_mask]

    if len(filtered_ids) == 0:
        search_engine_log("No in-stock products available for semantic search.")
        return []

    # --- Step 2: Compute cosine similarity ---
    sims = np.dot(filtered_embeddings, query_vec) / (
        embeddings_cache.EMBEDDINGS_NORM[in_stock_mask] * query_norm + 1e-8
    )

    top_idx = np.argsort(-sims)[:top_n]  # descending
    top_product_ids = filtered_ids[top_idx]

    search_engine_log(
        f"Top {top_n} in-stock product IDs (first 10): {top_product_ids[:10].tolist()}"
    )

    # --- Step 3: Fetch Product objects from DB ---
    products_qs = Product.objects.filter(id__in=top_product_ids)
    search_engine_log(f"Products fetched from DB: {products_qs.count()}")

    products_dict = {p.id: p for p in products_qs}

    # --- Step 4: Maintain original top-N order ---
    top_products = [products_dict[i] for i in top_product_ids if i in products_dict]
    search_engine_log(
        f"Top products returned (first 10 names): {[p.name for p in top_products[:10]]}"
    )

    return top_products


def get_query_embedding(raw_query: str):
    """Get query embedding from DB or generate it if missing."""

    uq = UserQueryEmbedding.objects.filter(query_text=raw_query).first()
    if uq and uq.embedding:
        return np.array(json.loads(uq.embedding))

    # If not cached, generate embedding
    try:
        search_engine_log(f"Generating live embedding '{raw_query}'")
        resp = client.embeddings.create(model="text-embedding-3-small", input=raw_query)
        query_embedding = np.array(resp.data[0].embedding)

        if not uq:
            UserQueryEmbedding.objects.create(
                query_text=raw_query,
                embedding=json.dumps(query_embedding.tolist()),
            )

        return query_embedding

    except Exception as e:
        search_engine_log(f"Failed to generate embedding for query '{raw_query}': {e}")
        return None
