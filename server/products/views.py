from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from products.models import Product
from rapidfuzz import fuzz


""" 
The user enters a search query in the frontend.

The backend splits the query into words (tokens) and filters the database to find matching products.

First, products are grouped by external_id to combine offers from different shops.

Next, products that are not exact matches but have very similar names are merged using fuzzy search, 
so slightly different names (like "Monitor Philips 24E2N1100LB" vs "Philips 24E2N1100LB Monitor") appear as the same product.

The backend sorts the aggregated products by lowest price and applies cursor-based pagination.

The response includes the aggregated products along with all available offers for comparison.
 """


FUZZY_THRESHOLD = 85

# Standard limits
LAYER1_LIMIT = 20
LAYER2_LIMIT = 5
LAYER3_LIMIT = 10


# ---------------- Layer 1: Search / Product Frames ----------------
class SearchAPIView(APIView):
    def get(self, request):
        raw_query = request.GET.get("q", "").strip()
        limit = min(int(request.GET.get("limit", LAYER1_LIMIT)), LAYER1_LIMIT)
        cursor = request.GET.get("cursor")

        if not raw_query:
            return Response({"products": [], "next_cursor": None})

        tokens = self.tokenize_query(raw_query)
        qs = self.filter_products_by_tokens(tokens)
        aggregated = self.aggregate_products(qs)
        print(f"[DEBUG] Aggregated products count: {len(aggregated)}")

        aggregated = self.merge_similar_names(aggregated)
        aggregated.sort(key=lambda x: (x["lowest_price"], x["id"]))

        if cursor:
            aggregated = self.apply_cursor(aggregated, cursor)

        frames = [
            {
                "id": p["id"],
                "name": p["name"],
                "brand": p["brand"],
                "category": p["category"],
                "variant": p["variant"],
                "lowest_price": p["lowest_price"],
                "offer_count": len(p["offers"]),
                "image": p["image"],
            }
            for p in aggregated[:limit]
        ]

        next_cursor = self.get_next_cursor(aggregated, limit)
        return Response({"products": frames, "next_cursor": next_cursor})

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

    def merge_similar_names(self, aggregated):
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
class ProductOffersAPIView(APIView):
    """
    Returns offers for a product.
    Default is lightweight preview (shop + price).
    Add ?full=true for full details.
    """

    def get(self, request, product_id):
        full = request.GET.get("full", "false").lower() == "true"
        limit = int(
            request.GET.get("limit", LAYER2_LIMIT if not full else LAYER3_LIMIT)
        )
        cursor = request.GET.get("cursor")

        offers = self.get_offers(product_id)
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

    def get_offers(self, product_id):
        qs = Product.objects.filter(external_id=product_id)
        if not qs.exists():
            return []
        return [
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
            for o in qs
        ]

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
