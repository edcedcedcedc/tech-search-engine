from django.shortcuts import render
from requests import request
from rest_framework.views import APIView
from rest_framework.response import Response
from products.models import Product
from rapidfuzz import fuzz


from rest_framework.throttling import ScopedRateThrottle
from products.throttles import Layer1Throttle, Layer2PreviewThrottle, Layer2FullThrottle

FUZZY_THRESHOLD = 85

# Standard limits
LAYER1_LIMIT = 20
LAYER2_LIMIT = 5
LAYER3_LIMIT = 10


# ---------------- Layer 1: Search / Product Frames ----------------
class SearchAPIView(APIView):
    throttle_classes = [Layer1Throttle]

    def get(self, request):
        raw_query = request.GET.get("q", "").strip()
        limit = min(int(request.GET.get("limit", LAYER1_LIMIT)), LAYER1_LIMIT)
        cursor = request.GET.get("cursor")

        if not raw_query:
            request.session["aggregated_cache"] = None
            return Response({"products": [], "next_cursor": None})

        tokens = self.tokenize_query(raw_query)
        qs = self.filter_products_by_tokens(tokens)

        aggregated = self.aggregate_products(qs)
        aggregated = self.identity_resolution(aggregated)
        aggregated = self.score_relevance(aggregated, raw_query)
        aggregated.sort(key=lambda x: (-x["relevance"], x["lowest_price"], x["id"]))

        if cursor:
            aggregated = self.apply_cursor(aggregated, cursor)

        # Cache the session
        request.session["aggregated_cache"] = aggregated

        probabilistic_clusters = [
            {
                "id": p["id"],
                "name": p["name"],
                "brand": p["brand"],
                "category": p["category"],
                "variant": p["variant"],
                "lowest_price": p["lowest_price"],
                "offers": len(p["offers"]),  # lightweight preview
                "relevance": p["relevance"],
                "image": p["image"],
            }
            for p in aggregated[:limit]
        ]

        next_cursor = self.get_next_cursor(aggregated, limit)
        return Response(
            {"products": probabilistic_clusters, "next_cursor": next_cursor}
        )

    def tokenize_query(self, query):
        return query.lower().split()

    def filter_products_by_tokens(self, tokens):
        qs = Product.objects.all()
        for t in tokens:
            qs = qs.filter(name__icontains=t)
        return qs

    def aggregate_products(self, qs):
        product_dict = {}
        for p in qs:
            product_dict.setdefault(p.external_id, []).append(p)
        return [
            self.build_aggregated_product(ext_id, offers)
            for ext_id, offers in product_dict.items()
        ]

    def build_aggregated_product(self, external_id, offers):
        rep = offers[0]
        return {
            "id": external_id,
            "name": rep.name,
            "brand": rep.brand,
            "category": rep.category,
            "variant": rep.variant,
            "offers": [
                {
                    "shop": o.shop,
                    "price": o.price,
                    "name": o.name,
                    "brand": o.brand,
                    "variant": o.variant,
                    "url": o.url,
                    "external_id": o.external_id,
                    "stock": True,
                }
                for o in offers
            ],
            "lowest_price": min(o.price for o in offers),
            "image": rep.image or "",
        }

    def identity_resolution(self, aggregated):
        merged = []
        while aggregated:
            base = aggregated.pop(0)
            similar = [base]
            for other in aggregated[:]:
                score = fuzz.token_sort_ratio(
                    base["name"].lower() + " " + (base["variant"] or ""),
                    other["name"].lower() + " " + (other["variant"] or ""),
                )
                if score >= FUZZY_THRESHOLD:
                    similar.append(other)
                    aggregated.remove(other)
            all_offers = [o for s in similar for o in s["offers"]]
            base["offers"] = all_offers
            base["lowest_price"] = min(o["price"] for o in all_offers)
            merged.append(base)
        return merged

    def score_relevance(self, aggregated, query: str):
        query = query.lower()
        query_tokens = query.split()
        for item in aggregated:
            text = f"{item['name']} {item.get('variant', '')}".lower()
            fuzzy_score = fuzz.token_set_ratio(query, text)
            token_hits = sum(1 for t in query_tokens if t in text)
            token_coverage = token_hits / max(len(query_tokens), 1)
            brand_score = 1.0 if item.get("brand", "").lower() in query else 0.0
            relevance = (
                0.6 * (fuzzy_score / 100) + 0.3 * token_coverage + 0.1 * brand_score
            )
            item["relevance"] = round(relevance, 4)
        return aggregated

    def apply_cursor(self, aggregated, cursor):
        try:
            last_id, last_price = cursor.split("_")
            last_price = int(last_price)
            return [
                p
                for p in aggregated
                if p["lowest_price"] > last_price
                or (p["lowest_price"] == last_price and p["id"] > last_id)
            ]
        except ValueError:
            return aggregated

    def get_next_cursor(self, aggregated, limit):
        if len(aggregated) > limit:
            last_item = aggregated[limit - 1]
            return f"{last_item['id']}_{last_item['lowest_price']}"
        return None


# ---------------- Layer 2: Offers (Preview / Full) ----------------
class ProductOffersAPIView(SearchAPIView):
    """
    Inherits from SearchAPIView.
    Returns offers for a product.
    Only works if Layer1 has been called and aggregated_cache exists.
    """

    def get(self, request, product_id):
        full = request.GET.get("full", "false").lower() == "true"

        if full:
            self.throttle_classes = [Layer2FullThrottle]
        else:
            self.throttle_classes = [Layer2PreviewThrottle]

        limit = int(
            request.GET.get("limit", LAYER2_LIMIT if not full else LAYER3_LIMIT)
        )

        cursor = request.GET.get("cursor")

        # access Layer1 aggregated cache
        aggregated = request.session.get("aggregated_cache")

        if not aggregated or not request.session.session_key:
            return Response({"error": "invalid session"}, status=403)

        product = next((p for p in aggregated if p["id"] == product_id), None)
        if not product:
            return Response({"offers": [], "has_more": False, "next_cursor": None})

        offers = product["offers"]
        offers.sort(key=lambda o: o["price"])

        if cursor:
            offers = self.apply_cursor(offers, cursor)

        result = (
            offers[:limit]
            if full
            else [
                {"shop": o["shop"], "name": o["name"], "price": o["price"]}
                for o in offers[:limit]
            ]
        )
        has_more = len(offers) > limit
        next_cursor = self.get_next_cursor(offers, limit)

        return Response(
            {"offers": result, "has_more": has_more, "next_cursor": next_cursor}
        )

    def apply_cursor(self, offers, cursor):
        try:
            last_price, last_shop = cursor.split("_")
            last_price = int(last_price)
            return [
                o
                for o in offers
                if o["price"] > last_price
                or (o["price"] == last_price and o["shop"] > last_shop)
            ]
        except ValueError:
            return offers

    def get_next_cursor(self, offers, limit):
        if len(offers) > limit:
            last_item = offers[limit - 1]
            return f"{last_item['price']}_{last_item['shop']}"
        return None
