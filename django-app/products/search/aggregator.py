from products.utils.log.search_engine_log import search_engine_log
import json
from products.search.config import MAX_PRODUCTS_TO_AGGREGATE
from products.search.config import LAYER1_LIMIT, CACHE_TTL_LAYER1, LAYER2_LIMIT


def aggregate_products(qs, query=None, query_embedding=None):
    """
    Aggregate products into clusters, attach embeddings and query info.
    """
    product_dict = {}
    product_count = 0
    for p in qs:
        if product_count >= MAX_PRODUCTS_TO_AGGREGATE:
            search_engine_log(
                f"Stopping aggregation early - reached max products ({MAX_PRODUCTS_TO_AGGREGATE})"
            )
            break

        cluster_key = p.similar_id
        product_dict.setdefault(cluster_key, []).append(p)
        search_engine_log(
            f"Adding product '{p.name} / {p.variant}' to cluster {cluster_key}"
        )
        product_count += 1
    return [
        build_aggregated_product(cluster_id, offers, query, query_embedding)
        for cluster_id, offers in product_dict.items()
    ]


def build_aggregated_product(cluster_id, offers, query=None, query_embedding=None):
    rep = offers[0]
    unique_shops = sorted({o.shop for o in offers if hasattr(o, "shop") and o.shop})
    # --- Product embedding as string ---
    cluster_embedding = ""
    if rep.embedding:
        try:
            if isinstance(rep.embedding, str):
                cluster_embedding = rep.embedding
            else:
                cluster_embedding = json.dumps(list(rep.embedding))
        except Exception as e:
            search_engine_log(f"Error serializing embedding for {rep.id}: {e}")

    # --- Normalize offers with embeddings, price history, query ---
    serialized_offers = []
    for o in offers:
        # Offer embedding
        offer_embedding = ""
        if hasattr(o, "embedding"):
            try:
                search_engine_log(
                    f"[OFFER_EMBED_DEBUG] Offer '{o.name}' embedding type={type(o.embedding)} "
                    f"len={len(o.embedding) if hasattr(o.embedding, '__len__') else 'N/A'}"
                )
                if isinstance(o.embedding, str):
                    offer_embedding = o.embedding
                elif hasattr(o.embedding, "__iter__"):
                    offer_embedding = json.dumps(list(o.embedding))
                else:
                    search_engine_log(
                        f"[OFFER_EMBED_WARN] Offer '{o.name}' embedding exists but not iterable"
                    )
            except Exception as e:
                search_engine_log(
                    f"[OFFER_EMBED_ERROR] Offer '{o.id}' serialization failed: {e}"
                )
        else:
            search_engine_log(
                f"[OFFER_EMBED_MISSING] Offer '{o.name}' has no embedding field"
            )

        try:
            price_history_list = [
                {
                    "price": float(ph.price),
                    "in_stock": ph.in_stock,
                    "recorded_at": ph.recorded_at.isoformat(),
                }
                for ph in getattr(o, "price_history_ordered", [])
            ]

            most_recent = price_history_list[:1]
            most_oldest = price_history_list[len(price_history_list) - 1 :]
            free_price_trend = most_recent + most_oldest
            hidden_price_trend_count = len(price_history_list)
        except Exception:
            price_history_list = []
            free_price_trend = []
            hidden_price_trend_count = 0

        serialized_offers.append(
            {
                "id": str(o.id),
                "name": o.name,
                "variant": o.variant or "",
                "brand": o.brand or "",
                "price": float(o.price),
                "t_name": o.t_name or {},
                "t_variant": o.t_variant or {},
                "t_category": o.t_category or {},
                "shop": o.shop,
                "url": o.url or "",
                "external_id": o.external_id or "",
                "in_stock": o.in_stock,
                "embedding": offer_embedding,
                "price_history": price_history_list,
                "price_trend_preview": {
                    "free_price_trend": free_price_trend,
                    "hidden_price_trend_count": hidden_price_trend_count,
                },
                "query": query,
                "query_embedding": (
                    json.dumps(query_embedding.tolist())
                    if query_embedding is not None
                    else None
                ),
            }
        )

    return {
        "id": str(cluster_id),
        "name": rep.name,
        "variant": rep.variant or "",
        "brand": rep.brand or "",
        "lowest_price": int(min(o.price for o in offers[:LAYER2_LIMIT])),
        "highest_price": int(max(o.price for o in offers[:LAYER2_LIMIT])),
        "average_price": int(
            sum(o.price for o in offers[:LAYER2_LIMIT]) / len(offers[:LAYER2_LIMIT])
        ),
        "t_name": rep.t_name or {},
        "t_variant": rep.t_variant or {},
        "t_category": rep.t_category or {},
        "offers": serialized_offers,
        "shops": unique_shops,
        "embedding": cluster_embedding,
        "image": rep.image or "",
        "query": query,
        "query_embedding": (
            json.dumps(query_embedding.tolist())
            if query_embedding is not None
            else None
        ),
    }
