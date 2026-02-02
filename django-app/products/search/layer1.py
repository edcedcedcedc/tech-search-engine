from rest_framework.views import APIView
from rest_framework.response import Response
import traceback
from products.throttles import (
    Layer1Throttle,
)
from products.utils.log.search_engine_log import search_engine_log
from products.search.score_cluster import score_cluster_for_query
from products.search.aggregator import aggregate_products
from products.search.embeddings import semantic_filter_products
from products.search.embeddings import get_query_embedding
from products.search.utils import apply_relevance_cutoff_sigmoid
from products.search.config import LAYER1_LIMIT
from products.serializers import AggregatedProductSerializer
from django.core.cache import cache
import hashlib
from products.search.identity import identity_resolution
from products.search.config import CACHE_TTL_LAYER1

"""Search/Product Discovery based on ML and Levenshtein

    Copyright (c) 2025-2026 Andro Ranogajec
    All rights reserved.
"""


def get_layer1_cache_key(query: str) -> str:
    # Hash the query into a fixed-length string
    query_hash = hashlib.md5(query.encode("utf-8")).hexdigest()
    return f"layer1:{query_hash}"


# ---------------- Layer 1: Search / Product Frames ----------------
class SearchAPIView(APIView):
    throttle_classes = [Layer1Throttle]

    def get(self, request):
        try:
            raw_query = request.GET.get("q", "").strip()
            limit = min(int(request.GET.get("limit", LAYER1_LIMIT)), LAYER1_LIMIT)
            cursor = request.GET.get("cursor")
            offset = int(cursor) if cursor and cursor.isdigit() else 0

            if not raw_query:
                request.session["aggregated_cache"] = None
                return Response({"products": [], "next_cursor": None})

            # --- Layer1 caching key ---
            cache_key = get_layer1_cache_key(raw_query)
            aggregated = cache.get(cache_key)

            if aggregated:
                search_engine_log(f"Layer1 cache HIT for query '{raw_query}'")
            else:
                search_engine_log(f"Layer1 cache MISS for query '{raw_query}'")
                query_embedding = get_query_embedding(raw_query)
                if query_embedding is None:
                    request.session["aggregated_cache"] = None
                    return Response({"products": [], "next_cursor": None})

                top_products = semantic_filter_products(query_embedding)
                aggregated = aggregate_products(top_products)
                aggregated = identity_resolution(aggregated)
                aggregated = score_cluster_for_query(
                    aggregated, raw_query, query_embedding
                )

                aggregated.sort(
                    key=lambda x: -x.get("product_score", x.get("relevance", 0))
                )
                aggregated = apply_relevance_cutoff_sigmoid(aggregated)

                # --- Store in Layer1 cache before session ---
                cache.set(cache_key, aggregated, CACHE_TTL_LAYER1)

            # --- Now update the session for Layer2 ---
            try:
                serializer = AggregatedProductSerializer(aggregated, many=True)
                request.session["aggregated_cache"] = serializer.data
            except Exception as e:
                search_engine_log(f"Error serializing aggregated clusters: {e}")
                request.session["aggregated_cache"] = aggregated

            # --- Slice for pagination ---
            aggregated_slice = aggregated[offset : offset + limit]
            total_count = len(aggregated)

            probabilistic_clusters = [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "brand": p["brand"],
                    "variant": p.get("variant"),
                    "lowest_price": p.get("lowest_price"),
                    "offers": len(p.get("offers", [])),
                    "relevance": p.get("relevance"),
                    "product_score": p.get("product_score"),
                    "image": p.get("image"),
                    "t_name": p.get("t_name", {}),
                    "t_variant": p.get("t_variant", {}),
                    "t_category": p.get("t_category", {}),
                    "shops": p.get("shops", []),
                }
                for p in aggregated_slice
            ]

            next_cursor = self.get_next_cursor(aggregated, limit, offset=offset)

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

    def apply_cursor(self, aggregated, cursor):
        try:
            offset = int(cursor)
            return aggregated[offset:]
        except (ValueError, TypeError):
            return aggregated

    def get_next_cursor(self, aggregated, limit, offset=0):
        next_offset = offset + limit
        if next_offset < len(aggregated):
            return str(next_offset)
        return None
