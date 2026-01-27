import math
from rapidfuzz import fuzz
from products.utils.log.search_engine_log import search_engine_log
import json
import numpy as np
from products.search.utils import cosine_similarity
import numpy as np


def score_offers_for_product(product, query_embedding=None):
    """Scores offers inside a product cluster using product-offer embeddings as base."""
    min_price = product["lowest_price"]
    product_relevance = product["relevance"]

    def offer_fuzzy_score(offer, product):
        """How well this offer matches the product cluster identity."""
        name_score = (
            fuzz.token_set_ratio(offer["name"].lower(), product["name"].lower()) / 100
        )
        variant_score = (
            fuzz.token_set_ratio(
                (offer.get("variant") or "").lower(),
                (product.get("variant") or "").lower(),
            )
            / 100
        )
        return 0.7 * name_score + 0.3 * variant_score

    def price_score(price, min_price):
        """Soft price influence. Never dominates identity."""
        if price <= 0 or min_price <= 0:
            return 0.0
        return 1 / math.log(price / min_price + 1.2)

    # Convert product embedding once
    product_emb = None
    if product.get("embedding"):
        try:
            product_emb = np.array(json.loads(product["embedding"]))
        except Exception as e:
            search_engine_log(
                f"Error loading product embedding for cluster {product['id']}: {e}"
            )

    for o in product["offers"]:
        if not o["in_stock"]:
            o["offer_score"] = 0.0
            continue

        # --- Base score: semantic similarity product -> offer ---
        product_semantic = 0.0
        if product_emb is not None and o.get("embedding"):
            try:
                offer_emb = np.array(json.loads(o["embedding"]))
                product_semantic = cosine_similarity(product_emb, offer_emb)
            except Exception as e:
                search_engine_log(
                    f"Error computing semantic similarity for offer {o['id']}: {e}"
                )

        # --- Minor factors ---
        levenshtein = offer_fuzzy_score(o, product)  # fuzzy match name+variant
        price_component = price_score(o["price"], min_price)  # soft price
        query_semantic = 0.0
        if query_embedding is not None and o.get("embedding"):
            try:
                offer_emb = np.array(json.loads(o["embedding"]))
                query_semantic = cosine_similarity(query_embedding, offer_emb)
            except:
                pass

        # --- Final combined score ---
        o["offer_score"] = round(
            0.55 * levenshtein  # strong identity match
            + 0.30 * product_semantic  # semantic embedding as secondary
            + 0.14 * product_relevance  # cluster relevance
            + 0.01 * query_semantic,
            4,
        )
