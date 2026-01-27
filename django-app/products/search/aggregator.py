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

    embedding = None
    if rep.embedding:
        try:
            if isinstance(rep.embedding, str):
                embedding = rep.embedding
            else:
                embedding = json.dumps(list(rep.embedding))
        except Exception as e:
            search_engine_log(f"Error serializing embedding for {rep.id}: {e}")

    return {
        "id": cluster_id,
        "name": rep.name,
        "variant": rep.variant,
        "t_name": rep.t_name or {},
        "t_variant": rep.t_variant or {},
        "brand": rep.brand,
        "t_category": rep.t_category or {},
        "offers": [
            {
                "id": o.id,
                "name": o.name,
                "variant": o.variant,
                "t_name": o.t_name or {},
                "t_variant": o.t_variant or {},
                "shop": o.shop,
                "price": float(o.price),
                "brand": o.brand,
                "url": o.url,
                "external_id": o.external_id,
                "in_stock": o.in_stock,
            }
            for o in offers
        ],
        "lowest_price": float(min(o.price for o in offers)),
        "shops": unique_shops,
        "embedding": embedding,
        "image": rep.image or "",
    }
