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
from products.search.config import SEMANTIC_PRODUCT_FILTER


env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


def semantic_filter_products(query_embedding, top_n=SEMANTIC_PRODUCT_FILTER):
    """Retrieve top products by cosine similarity using preloaded embeddings."""

    waited = 0
    while embeddings_cache.PRODUCT_EMBEDDINGS is None and waited < 5:
        time.sleep(0.1)
        waited += 0.1

    if (
        embeddings_cache.PRODUCT_EMBEDDINGS is None
        or embeddings_cache.PRODUCT_IDS is None
        or embeddings_cache.EMBEDDINGS_NORM is None
    ):
        search_engine_log("Warning: embedding cache not loaded yet!")
        return []

    # Convert to numpy arrays safely
    filtered_embeddings = np.array(
        embeddings_cache.PRODUCT_EMBEDDINGS, dtype=np.float32
    )
    filtered_norms = np.array(embeddings_cache.EMBEDDINGS_NORM, dtype=np.float32)
    filtered_ids = np.array(embeddings_cache.PRODUCT_IDS)

    search_engine_log(
        f"Embeddings loaded: {filtered_embeddings.shape}, Norms: {filtered_norms.shape}, IDs: {filtered_ids.shape}"
    )
    search_engine_log(
        f"Sample norms: {filtered_norms[:5]}, Sample IDs: {filtered_ids[:5]}"
    )

    # Recompute any None / NaN norms
    nan_mask = np.isnan(filtered_norms)
    if np.any(nan_mask):
        search_engine_log(f"Found {nan_mask.sum()} NaN norms, recomputing...")
        filtered_norms[nan_mask] = np.linalg.norm(filtered_embeddings[nan_mask], axis=1)
        search_engine_log(f"Recomputed norms sample: {filtered_norms[:5]}")

    # Compute query norm
    query_vec = np.array(query_embedding, dtype=np.float32)
    query_norm = np.linalg.norm(query_vec)
    search_engine_log(f"Query vector norm: {query_norm}")

    # Compute cosine similarity safely
    try:
        sims = np.dot(filtered_embeddings, query_vec) / (
            filtered_norms * query_norm + 1e-8
        )
    except Exception as e:
        search_engine_log(f"Error computing cosine similarity: {e}")
        return []

    # Get top N indices
    top_idx = np.argsort(-sims)[:top_n]
    top_product_ids = filtered_ids[top_idx]
    search_engine_log(
        f"Top {top_n} product IDs (first 10): {top_product_ids[:10].tolist()}"
    )

    # Fetch Products from DB
    products_qs = Product.objects.filter(id__in=top_product_ids)
    search_engine_log(f"Products fetched from DB: {products_qs.count()}")

    products_dict = {p.id: p for p in products_qs}
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
