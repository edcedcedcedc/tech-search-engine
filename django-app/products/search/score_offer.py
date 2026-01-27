import math
from rapidfuzz import fuzz
from products.utils.log.search_engine_log import search_engine_log
import json
import numpy as np
from products.search.utils import cosine_similarity
import numpy as np


""" def score_offers_for_product(product, query_embedding=None):
   
    min_price = product["lowest_price"]
    product_relevance = product["relevance"]

    def offer_fuzzy_score(offer, product):
       
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
     
        if price <= 0 or min_price <= 0:
            return 0.0
        return 1 / math.log(price / min_price + 1.2)

    # Convert product embedding once
    product_emb = None
    if product.get("_embedding"):
        try:
            product_emb = np.array(json.loads(product["_embedding"]))
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
        if product_emb is not None and o.get("_embedding"):
            try:
                offer_emb = np.array(json.loads(o["_embedding"]))
                product_semantic = cosine_similarity(product_emb, offer_emb)
            except Exception as e:
                search_engine_log(
                    f"Error computing semantic similarity for offer {o['id']}: {e}"
                )

        # --- Minor factors ---
        levenshtein = offer_fuzzy_score(o, product)  # fuzzy match name+variant
        price_component = price_score(o["price"], min_price)  # soft price
        query_semantic = 0.0
        if query_embedding is not None and o.get("_embedding"):
            try:
                offer_emb = np.array(json.loads(o["_embedding"]))
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

 """


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
            fuzz.token_set_ratio(o["name"].lower(), product["name"].lower()) / 100
        )
        variant_score = (
            fuzz.token_set_ratio(
                (o.get("variant") or "").lower(), (product.get("variant") or "").lower()
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
