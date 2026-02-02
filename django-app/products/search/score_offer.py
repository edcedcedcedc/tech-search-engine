import math
from rapidfuzz import fuzz
import json
import numpy as np
from products.search.utils import ascii_folding, cosine_similarity
import numpy as np


def score_offers_for_product(product, query_embedding=None):
    min_price = product["lowest_price"]
    product_relevance = product["relevance"]

    # Prepare cluster embedding
    product_emb = (
        np.array(json.loads(product["_embedding"]))
        if product.get("_embedding")
        else None
    )

    shop_seen = set()
    for o in product["offers"]:
        if not o["in_stock"]:
            o["offer_score"] = 0.0
            continue

        # --- Identity match (fuzzy) ---
        name_score = (
            fuzz.token_set_ratio(
                ascii_folding(o["name"].lower()), ascii_folding(product["name"].lower())
            )
            / 100
        )
        variant_score = (
            fuzz.token_set_ratio(
                ascii_folding((o.get("variant") or "").lower()),
                ascii_folding((product.get("variant") or "").lower()),
            )
            / 100
        )
        identity_score = 0.7 * name_score + 0.3 * variant_score

        # --- Semantic similarity: offer -> cluster ---
        semantic_score = 0.0
        if product_emb is not None and o.get("_embedding"):
            offer_emb = np.array(json.loads(o["_embedding"]))
            semantic_score = cosine_similarity(product_emb, offer_emb)

        # --- Semantic similarity: offer -> query ---
        query_semantic = 0.0
        if query_embedding is not None and o.get("_embedding"):
            offer_emb = np.array(json.loads(o["_embedding"]))
            query_semantic = cosine_similarity(query_embedding, offer_emb)

        # --- Price factor: cheaper is better ---
        if o["price"] > 0 and min_price > 0:
            price_score = 1 / math.log(o["price"] / min_price + 1.1)
            price_score = min(price_score, 1.0)
        else:
            price_score = 0.0

        # --- Shop diversity factor ---
        if o["shop"] in shop_seen:
            diversity_factor = 0.9
        else:
            diversity_factor = 1.0
            shop_seen.add(o["shop"])

        # --- Final weighted score ---
        o["offer_score"] = round(
            (
                0.55 * identity_score
                + 0.25 * semantic_score
                + 0.10 * product_relevance
                + 0.09 * query_semantic
                + 0.01 * price_score
            )
            * diversity_factor,
            4,
        )
