from products.utils.log.search_engine_log import search_engine_log
import json


def aggregate_products(qs):
    product_dict = {}

    for p in qs:
        cluster_key = p.similar_id
        product_dict.setdefault(cluster_key, []).append(p)
        search_engine_log(
            f"Adding product '{p.name} / {p.variant}' to cluster {cluster_key}"
        )
    return [
        build_aggregated_product(cluster_id, offers)
        for cluster_id, offers in product_dict.items()
    ]


def build_aggregated_product(cluster_id, offers):
    rep = offers[0]
    unique_shops = sorted({o.shop for o in offers})

    # --- Product embedding as string ---
    cluter_embedding = ""
    if rep.embedding:
        try:
            if isinstance(rep.embedding, str):
                cluster_embedding = rep.embedding
            else:
                cluster_embedding = json.dumps(list(rep.embedding))
        except Exception as e:
            search_engine_log(f"Error serializing embedding for {rep.id}: {e}")

    # --- Normalize offers with embeddings and price history ---
    serialized_offers = []
    for o in offers:
        # Offer embedding
        offer_embedding = ""
        if getattr(o, "embedding", None):
            try:
                if isinstance(o.embedding, str):
                    offer_embedding = o.embedding
                else:
                    offer_embedding = json.dumps(list(o.embedding))
            except Exception as e:
                search_engine_log(f"Error serializing offer embedding {o.id}: {e}")

        # Price history
        try:
            price_history_list = [
                {
                    "price": float(ph.price),
                    "in_stock": ph.in_stock,
                    "recorded_at": ph.recorded_at.isoformat(),
                }
                for ph in getattr(o, "price_history_ordered", [])
            ]
        except Exception:
            price_history_list = []

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
                "_embedding": offer_embedding,
                "price_history": price_history_list,
            }
        )

    return {
        "id": str(cluster_id),
        "name": rep.name,
        "variant": rep.variant or "",
        "brand": rep.brand or "",
        "lowest_price": float(min(o.price for o in offers)),
        "t_name": rep.t_name or {},
        "t_variant": rep.t_variant or {},
        "t_category": rep.t_category or {},
        "offers": serialized_offers,
        "shops": unique_shops,
        "_embedding": cluster_embedding,
        "image": rep.image or "",
    }
