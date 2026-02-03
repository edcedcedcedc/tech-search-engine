import math
from rapidfuzz import fuzz
import json
import numpy as np
from products.search.utils import ascii_folding, cosine_similarity
from products.utils.log.search_engine_log import search_engine_log


def score_offers_for_product(product):
    min_price = product["lowest_price"]
    product_relevance = product.get("relevance", 0)

    # --- Prepare cluster embedding ---
    try:
        product_emb = (
            np.array(json.loads(product["embedding"]))
            if product.get("embedding")
            else None
        )
    except Exception as e:
        product_emb = None
        search_engine_log(f"[EmbeddingError] Failed to load product embedding: {e}")

    if product_emb is not None:
        search_engine_log(
            f"[Debug] Product embedding shape={product_emb.shape}, first5={product_emb[:5]}"
        )
    else:
        search_engine_log(f"[Debug] Product embedding is None")

    # --- Prepare query embedding ---
    try:
        query_emb = (
            np.array(json.loads(product["query_embedding"]))
            if product.get("query_embedding")
            else None
        )
    except Exception as e:
        query_emb = None
        search_engine_log(f"[EmbeddingError] Failed to load query embedding: {e}")

    if query_emb is not None:
        search_engine_log(
            f"[Debug] Query embedding shape={query_emb.shape}, first5={query_emb[:5]}"
        )
    else:
        search_engine_log(f"[Debug] Query embedding is None")

    raw_query = product.get("query", "")
    shop_seen = set()

    for o in product["offers"]:
        if not o["in_stock"]:
            o["offer_score"] = 0.0
            continue

        # --- Load offer embedding ---
        offer_emb = None
        if o.get("embedding"):
            try:
                if o["embedding"].strip() == "":
                    offer_emb = None
                else:
                    offer_emb = np.array(json.loads(o["embedding"]))
                if offer_emb is not None:
                    search_engine_log(
                        f"[Debug] Offer '{o['name']}' embedding shape={offer_emb.shape}, first5={offer_emb[:5]}"
                    )
                else:
                    search_engine_log(f"[Debug] Offer '{o['name']}' embedding is None")
            except Exception as e:
                search_engine_log(
                    f"[OfferEmbeddingError] Offer '{o['name']}' failed to load embedding: {e}"
                )
                offer_emb = None
        else:
            search_engine_log(
                f"[OfferEmbeddingMissing] Offer '{o['name']}' has no _embedding"
            )

        # --- Identity match (fuzzy) with product ---
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

        # --- Identity match (fuzzy) with query ---
        query_name_score = (
            fuzz.token_set_ratio(
                ascii_folding(o["name"].lower()), ascii_folding(raw_query.lower())
            )
            / 100
        )
        query_variant_score = (
            fuzz.token_set_ratio(
                ascii_folding((o.get("variant") or "").lower()),
                ascii_folding(raw_query.lower()),
            )
            / 100
        )
        query_identity_score = 0.7 * query_name_score + 0.3 * query_variant_score

        # --- Semantic similarity ---
        semantic_score = 0.0
        if product_emb is not None and offer_emb is not None:
            try:
                semantic_score = cosine_similarity(product_emb, offer_emb)
            except Exception as e:
                search_engine_log(
                    f"[SemanticError] Offer '{o['name']}' failed cluster semantic: {e}"
                )

        query_semantic = 0.0
        if query_emb is not None and offer_emb is not None:
            try:
                query_semantic = cosine_similarity(query_emb, offer_emb)
            except Exception as e:
                search_engine_log(
                    f"[SemanticError] Offer '{o['name']}' failed query semantic: {e}"
                )

        # --- Price factor ---
        if o["price"] > 0 and min_price > 0:
            price_score = 1 / math.log(o["price"] / min_price + 1.1)
            price_score = min(price_score, 1.0)
        else:
            price_score = 0.0

        # --- Shop diversity factor ---
        diversity_factor = 0.9 if o["shop"] in shop_seen else 1.0
        shop_seen.add(o["shop"])

        # --- Final score ---
        final_score = round(
            (
                0.05 * identity_score
                + 0.55 * query_identity_score
                + 0.20 * semantic_score
                + 0.15 * query_semantic
                + 0.04 * product_relevance
                + 0.01 * price_score
            )
            * diversity_factor,
            4,
        )

        o["offer_score"] = final_score

        # --- Debug log for scoring ---
        search_engine_log(
            f"[OfferScore] Product '{product['name']}' | Offer '{o['name']}' | "
            f"identity={identity_score:.3f}, semantic={semantic_score:.3f}, "
            f"product_relevance={product_relevance:.3f}, "
            f"query_identity={query_identity_score:.3f}, query_semantic={query_semantic:.3f}, "
            f"price={price_score:.3f}, diversity={diversity_factor:.2f} => score={final_score}"
        )
