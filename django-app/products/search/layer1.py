import json
import hashlib
import traceback

from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.cache import cache

from products.throttles import Layer1Throttle
from products.utils.log.search_engine_log import search_engine_log
from products.search.score_cluster import score_cluster_for_query
from products.search.aggregator import aggregate_products
from products.search.embeddings import semantic_filter_products, get_query_embedding
from products.search.utils import apply_relevance_cutoff_sigmoid
from products.search.identity import identity_resolution
from products.search.config import LAYER1_LIMIT, CACHE_TTL_LAYER1, LAYER3_LIMIT
from products.serializers import AggregatedProductSerializer
from products.system_state.version import get_global_system_version


def get_layer1_cache_key(query: str) -> str:
    query_hash = hashlib.md5(query.encode("utf-8")).hexdigest()
    return f"layer1:{query_hash}"


# ---------------- Layer 1: Search / Product Frames ----------------
class SearchAPIView(APIView):
    throttle_classes = [Layer1Throttle]

    def get(self, request):
        try:
            current_version = get_global_system_version()
            request.session["search_version"] = current_version
            request.session.modified = True

            raw_query = request.GET.get("q", "").strip()
            limit = min(int(request.GET.get("limit", LAYER1_LIMIT)), LAYER1_LIMIT)
            cursor = request.GET.get("cursor")
            offset = int(cursor) if cursor and cursor.isdigit() else 0

            if not raw_query:
                request.session["aggregated_cache"] = None
                return Response({"products": [], "next_cursor": None})

            cache_key = get_layer1_cache_key(raw_query)
            aggregated = cache.get(cache_key)

            # ================= CACHE HIT =================
            if aggregated:
                search_engine_log(f"Layer1 cache HIT for query '{raw_query}'")

            # ================= CACHE MISS =================
            else:
                search_engine_log(f"Layer1 cache MISS for query '{raw_query}'")

                query_embedding = get_query_embedding(raw_query)
                if query_embedding is None:
                    request.session["aggregated_cache"] = None
                    return Response({"products": [], "next_cursor": None})

                top_products = semantic_filter_products(query_embedding)

                aggregated = aggregate_products(
                    top_products,
                    query=raw_query,
                    query_embedding=query_embedding,
                )

                # --- DEBUG ---
                for cluster in aggregated[:5]:
                    search_engine_log(
                        f"[LAYER1_OFFER_DEBUG] Cluster '{cluster['name']}' ({len(cluster['offers'])} offers)"
                    )
                    for o in cluster["offers"]:
                        emb_preview = str(o.get("embedding"))[:100]
                        q_preview = str(o.get("query"))[:100]
                        qe_preview = str(o.get("query_embedding"))[:100]

                        search_engine_log(
                            f"Offer '{o['name']}' | shop={o['shop']} | price={o['price']} | "
                            f"embedding_preview={emb_preview} | "
                            f"query_preview={q_preview} | "
                            f"query_embedding_preview={qe_preview}"
                        )

                # ---- heavy logic ONLY on MISS ----
                aggregated = identity_resolution(aggregated)
                aggregated = score_cluster_for_query(
                    aggregated, raw_query, query_embedding
                )
                aggregated.sort(
                    key=lambda x: -x.get("product_score", x.get("relevance", 0))
                )
                aggregated = apply_relevance_cutoff_sigmoid(aggregated)

                cache.set(cache_key, aggregated, CACHE_TTL_LAYER1)

            # ================= SESSION CACHE =================
            try:
                serializer = AggregatedProductSerializer(aggregated, many=True)
                request.session["aggregated_cache"] = serializer.data
                request.session.modified = True
            except Exception as e:
                search_engine_log(f"Error serializing aggregated clusters: {e}")
                request.session["aggregated_cache"] = aggregated

            # ================= RESPONSE =================
            aggregated_slice = aggregated[offset : offset + limit]

            total_count = len(aggregated)

            probabilistic_clusters = [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "brand": p["brand"],
                    "variant": p.get("variant"),
                    "lowest_price": p.get("lowest_price"),
                    "offers_count": (
                        50
                        if len(p.get("offers", [])) > 50
                        else len(p.get("offers", []))
                    ),
                    "offers": [],
                    # "relevance": p.get("relevance"),
                    # "product_score": p.get("product_score"),
                    "image": p.get("image"),
                    "t_name": p.get("t_name", {}),
                    "t_variant": p.get("t_variant", {}),
                    "t_category": p.get("t_category", {}),
                    "shops": p.get("shops", []),
                }
                for p in aggregated_slice
            ]

            next_cursor = self.get_next_cursor(aggregated, limit, offset)

            return Response(
                {
                    "products": probabilistic_clusters,
                    "next_cursor": next_cursor,
                    "total_count": total_count,
                    "limit": limit,
                    "offset": offset,
                }
            )

        except Exception as e:
            trace = traceback.format_exc()
            search_engine_log(f"Error in SearchAPIView: {e}\n{trace}")
            return Response({"error": "Internal server error"}, status=500)

    def get_next_cursor(self, aggregated, limit, offset=0):
        next_offset = offset + limit
        return str(next_offset) if next_offset < len(aggregated) else None
