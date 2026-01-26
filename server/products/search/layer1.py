from rest_framework.views import APIView
from rest_framework.response import Response
import traceback
from products.throttles import (
    Layer1Throttle,
)
from products.utils.log.search_engine_log import search_engine_log
from products.search.score_cluster import score_relevance
from products.search.aggregator import aggregate_products
from products.search.embeddings import semantic_filter_products
from products.search.embeddings import get_query_embedding
from products.search.identity import identity_resolution
from products.search.config import LAYER1_LIMIT


# ---------------- Layer 1: Search / Product Frames ----------------
class SearchAPIView(APIView):
    throttle_classes = [Layer1Throttle]

    def get(self, request):
        try:
            raw_query = request.GET.get("q", "").strip()
            query_embedding = get_query_embedding(raw_query)
            search_engine_log(f"Received raw query: '{raw_query}'")

            limit = min(int(request.GET.get("limit", LAYER1_LIMIT)), LAYER1_LIMIT)
            cursor = request.GET.get("cursor")
            offset = int(cursor) if cursor and cursor.isdigit() else 0

            if not raw_query or query_embedding is None:
                request.session["aggregated_cache"] = None
                return Response({"products": [], "next_cursor": None})

            top_products = semantic_filter_products(query_embedding)
            aggregated = aggregate_products(top_products)
            aggregated = identity_resolution(aggregated)
            aggregated = score_relevance(aggregated, raw_query, query_embedding)

            # FILTER CLUSTERS BELOW 0.55
            # aggregated = [p for p in aggregated if p.get("product_score", 0) >= 0.55]

            aggregated.sort(key=lambda x: -x.get("product_score", x["relevance"]))

            # Slice using index-based cursor
            aggregated_slice = aggregated[offset : offset + limit]

            # Save full sorted aggregated cache in session for Layer2
            request.session["aggregated_cache"] = aggregated

            probabilistic_clusters = [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "brand": p["brand"],
                    "t_category": p.get("t_category", {}),
                    "variant": p["variant"],
                    "lowest_price": p["lowest_price"],
                    "offers": len(p["offers"]),
                    "relevance": p["relevance"],
                    "product_score": p["product_score"],
                    "image": p["image"],
                    "t_name": p.get("t_name", {}),
                    "t_variant": p.get("t_variant", {}),
                    "shops": p.get("shops", []),
                }
                for p in aggregated_slice
            ]

            next_cursor = self.get_next_cursor(aggregated, limit, offset=offset)
            return Response(
                {"products": probabilistic_clusters, "next_cursor": next_cursor}
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
