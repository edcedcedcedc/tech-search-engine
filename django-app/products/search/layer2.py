import hashlib
from django.core.cache import cache
from rest_framework.response import Response
from products.throttles import Layer2PreviewThrottle, Layer2FullThrottle
from products.utils.log.search_engine_log import search_engine_log
from products.search.score_offer import score_offers_for_product
from products.search.config import LAYER2_LIMIT, LAYER3_LIMIT, CACHE_TTL_LAYER2
from rest_framework.views import APIView


def get_layer1_cache_key(query: str) -> str:
    """Same cache key as Layer1"""
    query_hash = hashlib.md5(query.encode("utf-8")).hexdigest()
    return f"layer1:{query_hash}"


def get_offers_cache_key(product_id: str) -> str:
    """Independent offers cache key"""
    return f"layer2:{product_id}"


class ProductOffersAPIView(APIView):
    def get(self, request, product_id):
        full = request.GET.get("full", "false").lower() == "true"
        limit = int(
            request.GET.get("limit", LAYER2_LIMIT if not full else LAYER3_LIMIT)
        )

        self.throttle_classes = (
            [Layer2FullThrottle] if full else [Layer2PreviewThrottle]
        )

        cursor = request.GET.get("cursor")
        offset = int(cursor) if cursor and cursor.isdigit() else 0
        query = request.GET.get("query")  # 👈 REQUIRED for first request

        # ============= STEP 1: Try offers cache (no query needed) =============
        offers_cache_key = get_offers_cache_key(product_id)
        offers = cache.get(offers_cache_key)

        if offers:
            search_engine_log(f"Layer2 cache HIT for product '{product_id}'")
        else:
            search_engine_log(f"Layer2 cache MISS for product '{product_id}'")

            # ============= STEP 2: Need query to find in Layer1 cache =============
            if not query:
                return Response(
                    {"error": "query parameter required for first request"}, status=400
                )

            # Find product in Layer1 cache
            layer1_cache_key = get_layer1_cache_key(query)
            aggregated = cache.get(layer1_cache_key)

            if not aggregated:
                return Response(
                    {"error": "Product data expired - please search again"}, status=404
                )

            # Extract the specific product
            product = next((p for p in aggregated if p["id"] == product_id), None)
            if not product:
                return Response(
                    {"error": "Product not found in search results"}, status=404
                )

            # Score and prepare offers
            score_offers_for_product(product)
            offers = sorted(
                product["offers"], key=lambda o: o.get("offer_score", 0), reverse=True
            )

            # ============= STEP 3: Store in offers cache (24h) =============
            cache.set(offers_cache_key, offers, CACHE_TTL_LAYER2)
            search_engine_log(f"💾 Cached offers for product '{product_id}' (24h)")

        # ============= STEP 4: Pagination =============
        total_offers = len(offers)
        offers_slice = offers[offset : offset + limit]

        # Format response
        if full:
            result = [
                {
                    "id": o["id"],
                    "external_id": o.get("external_id", ""),
                    "name": o["name"],
                    "variant": o.get("variant", ""),
                    "t_name": o.get("t_name", {}),
                    "t_variant": o.get("t_variant", {}),
                    "t_category": o.get("t_category", {}),
                    "shop": o["shop"],
                    "price": o["price"],
                    "url": o.get("url", ""),
                    "brand": o.get("brand", ""),
                    "in_stock": o.get("in_stock", True),
                    "offer_score": o.get("offer_score", 0.0),
                    "price_history": o.get("price_history", []),
                    "price_trend_preview": o.get("price_trend_preview", None),
                }
                for o in offers_slice
            ]
        else:
            result = [
                {
                    "id": o["id"],
                    "external_id": o.get("external_id", ""),
                    "name": o["name"],
                    "variant": o.get("variant", ""),
                    "t_name": o.get("t_name", {}),
                    "t_variant": o.get("t_variant", {}),
                    "shop": o["shop"],
                    "price": o["price"],
                    "offer_score": o.get("offer_score", 0.0),
                }
                for o in offers_slice
            ]

        next_cursor = str(offset + limit) if offset + limit < total_offers else None
        has_more = next_cursor is not None

        return Response(
            {
                "offers": result,
                "has_more": has_more,
                "next_cursor": next_cursor,
                "total_count": total_offers,  # 👈 Useful for UI
            }
        )
