from rest_framework.response import Response
from products.throttles import (
    Layer2PreviewThrottle,
    Layer2FullThrottle,
)
from products.utils.log.search_engine_log import search_engine_log
from products.search.score_offer import score_offers_for_product
from products.search.config import LAYER2_LIMIT, LAYER3_LIMIT
from products.search.layer1 import SearchAPIView


# ---------------- Layer 2: Offers (Preview / Full) ----------------
class ProductOffersAPIView(SearchAPIView):
    """
    Returns offers for a product.
    Works only if Layer1 has been called and aggregated_cache exists.
    """

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

        aggregated = request.session.get("aggregated_cache")
        if not aggregated or not request.session.session_key:
            return Response({"error": "invalid session"}, status=403)

        product = next((p for p in aggregated if p["id"] == product_id), None)
        if not product:
            return Response({"offers": [], "has_more": False, "next_cursor": None})

        # Score offers internally
        score_offers_for_product(product)

        # Grab offers from aggregated cluster
        offers = product["offers"]

        # Sort offers by score descending
        offers = sorted(offers, key=lambda o: o.get("offer_score", 0), reverse=True)

        # Slice offers according to cursor/limit
        offers_slice = offers[offset : offset + limit]

        # --- Prepare API response WITHOUT embeddings ---
        if full:
            result = offers_slice
        else:
            # Minimal preview
            result = [
                {"shop": o["shop"], "name": o["name"], "price": o["price"]}
                for o in offers_slice
            ]

        next_cursor = str(offset + limit) if offset + limit < len(offers) else None
        has_more = next_cursor is not None

        search_engine_log(
            f"Product '{product_id}' offers count={len(product['offers'])}, "
            f"limit={limit}, full={full}, cursor={cursor}"
        )

        return Response(
            {"offers": result, "has_more": has_more, "next_cursor": next_cursor}
        )

    def apply_cursor(self, offers, cursor):
        """Index-based cursor for universal pagination."""
        try:
            offset = int(cursor)
            return offers[offset:]
        except (ValueError, TypeError):
            return offers

    def get_next_cursor(self, offers, limit, offset=0):
        """Return next cursor based on index."""
        next_offset = offset + limit
        if next_offset < len(offers):
            return str(next_offset)
        return None
