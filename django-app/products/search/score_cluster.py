import math
from rapidfuzz import fuzz
from products.utils.log.search_engine_log import search_engine_log
import json
import numpy as np
from products.search.utils import ascii_folding, cosine_similarity


def score_cluster_for_query(aggregated, query: str, query_embedding=None):
    """
    Score product clusters for a given query using hybrid matching:
    - Fuzzy match (name + variant)
    - Brand presence
    - Semantic similarity (query -> product embedding)
    - Price influence (smaller price gives small boost)
    """
    query_lower = query.lower()
    query_lower = ascii_folding(query_lower)
    for item in aggregated:
        # --- Fuzzy match: name + variant ---
        product_text = f"{ascii_folding(item['name'])} {ascii_folding(item.get('variant', ''))}".lower()
        fuzzy_score = fuzz.token_set_ratio(query_lower, product_text) / 100.0

        # --- Optional brand boost ---
        brand_score = 1.0 if item.get("brand", "").lower() in query_lower else 0.0

        # --- Semantic similarity: query embedding -> product embedding ---
        semantic_similarity = 0.0
        if query_embedding is not None and item.get("_embedding"):
            try:
                product_emb = np.array(json.loads(item["_embedding"]))
                semantic_similarity = cosine_similarity(query_embedding, product_emb)
            except Exception as e:
                search_engine_log(
                    f"Error computing semantic similarity for '{item['name']}': {e}"
                )

        # --- Optional: variant-specific boost (minor) ---
        variant_score = 0.0
        if "variant" in item and item["variant"]:
            variant_tokens = item["variant"].lower().split()
            variant_hits = sum(1 for t in query_lower.split() if t in variant_tokens)
            variant_score = variant_hits / max(len(query_lower.split()), 1)

        # --- Hybrid relevance score ---
        relevance = (
            0.5 * fuzzy_score  # main identity match
            + 0.4 * semantic_similarity  # stronger semantic weight
            + 0.05 * brand_score  # small brand bonus
            + 0.05 * variant_score  # minor variant match bonus
        )
        item["relevance"] = round(relevance, 4)

        # --- Hybrid product score including price ---
        price_factor = (
            0.5 / math.log(item["lowest_price"] + 2) if item["lowest_price"] > 0 else 0
        )
        item["product_score"] = round(0.9 * relevance + 0.1 * price_factor, 4)

        search_engine_log(
            f"Product '{item['name']}' -> fuzzy={fuzzy_score:.3f}, "
            f"variant={variant_score:.3f}, brand={brand_score:.1f}, "
            f"semantic={semantic_similarity:.4f}, relevance={item['relevance']}"
        )

    return aggregated
