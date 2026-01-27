import math
from rapidfuzz import fuzz
from products.utils.log.search_engine_log import search_engine_log
import json
import numpy as np
from products.search.utils import cosine_similarity


def score_relevance(aggregated, query: str, query_embedding=None):
    query = query.lower()
    query_tokens = query.split()
    for item in aggregated:
        # fuzzy match
        text = f"{item['name']} {item.get('variant', '')}".lower()
        fuzzy_score = fuzz.token_set_ratio(query, text)
        token_hits = sum(1 for t in query_tokens if t in text)
        token_coverage = token_hits / max(len(query_tokens), 1)
        brand_score = 1.0 if item.get("brand", "").lower() in query else 0.0

        # semantic match
        semantic_similarity = 0.0
        if query_embedding is not None and item.get("embedding"):
            try:
                product_emb = np.array(json.loads(item["embedding"]))
                semantic_similarity = cosine_similarity(query_embedding, product_emb)
            except Exception as e:
                search_engine_log(f"Error computing semantic similarity: {e}")

        relevance = (
            0.55 * (fuzzy_score / 100)
            + 0.25 * token_coverage
            + 0.1 * brand_score
            + 0.1 * semantic_similarity  # add semantic boost
        )
        item["relevance"] = round(relevance, 4)
        # --- new hybrid score including price influence ---
        # protect against price=0
        price_factor = 0.5 / math.log(
            item["lowest_price"] + 2
        )  # +2 to avoid log(0) or very cheap anomalies
        item["product_score"] = round(0.9 * relevance + 0.1 * price_factor, 4)

        search_engine_log(
            f"Product '{item['name']}' -> fuzzy={fuzzy_score}, "
            f"token_cov={token_coverage:.2f}, brand={brand_score}, "
            f"semantic={semantic_similarity:.4f}, relevance={item['relevance']}"
        )
    return aggregated
