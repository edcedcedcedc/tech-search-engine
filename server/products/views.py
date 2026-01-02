from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response

from products.utils.normalization import normalize_text
from .models import Product
from .serializers import AggregatedProductSerializer
from rapidfuzz import fuzz


FUZZY_THRESHOLD = 85  # similarity % to consider products the same


""" 
The user enters a search query in the frontend.

The backend splits the query into words (tokens) and filters the database to find matching products.

First, products are grouped by external_id to combine offers from different shops.

Next, products that are not exact matches but have very similar names are merged using fuzzy search, 
so slightly different names (like "Monitor Philips 24E2N1100LB" vs "Philips 24E2N1100LB Monitor") appear as the same product.

The backend sorts the aggregated products by lowest price and applies cursor-based pagination.

The response includes the aggregated products along with all available offers for comparison.
 """


class SearchAPIView(APIView):
    def get(self, request):
        raw_query = request.GET.get("q", "").strip()
        query = normalize_text(raw_query)
        limit = int(request.GET.get("limit", 20))
        cursor = request.GET.get("cursor")  # optional

        if not query:
            return Response({"products": [], "next_cursor": None})

        tokens = self.tokenize_query(query)
        qs = self.filter_products_by_tokens(tokens)
        aggregated = self.aggregate_products(qs)
        aggregated = self.merge_similar_names(aggregated)  # fuzzy merge fallback
        aggregated.sort(key=lambda x: (x["lowest_price"], x["id"]))

        if cursor:
            aggregated = self.apply_cursor(aggregated, cursor)

        result = aggregated[:limit]
        next_cursor = self.get_next_cursor(aggregated, limit)

        return Response(
            {
                "products": AggregatedProductSerializer(result, many=True).data,
                "next_cursor": next_cursor,
            }
        )

    # --- Helper Functions ---

    def tokenize_query(self, query: str):
        """Split query into lowercase tokens."""
        return query.lower().split()

    def filter_products_by_tokens(self, tokens):
        """Filter DB products by query tokens."""
        qs = Product.objects.all()
        for t in tokens:
            qs = qs.filter(name__icontains=t)
        return qs

    def aggregate_products(self, qs):
        """
        Aggregate products by external_id first (merge offers from different shops)
        """
        product_dict = {}
        for p in qs:
            key = p.external_id
            if key not in product_dict:
                product_dict[key] = []
            product_dict[key].append(p)

        aggregated = []
        for external_id, offers in product_dict.items():
            aggregated.append(self.build_aggregated_product(external_id, offers))

        return aggregated

    def build_aggregated_product(self, external_id, offers):
        """Build aggregated product dict from offers."""
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
        """Merge products with different external_ids but similar names/variants."""
        merged = []
        while aggregated:
            base = aggregated.pop(0)
            similar = [base]

            for other in aggregated[:]:
                name_score = fuzz.token_sort_ratio(
                    base["name"].lower() + " " + (base["variant"] or ""),
                    other["name"].lower() + " " + (other["variant"] or ""),
                )
                if name_score >= FUZZY_THRESHOLD:
                    similar.append(other)
                    aggregated.remove(other)

            # Merge offers from similar products
            all_offers = []
            for s in similar:
                all_offers.extend(s["offers"])
            base["offers"] = all_offers
            base["lowest_price"] = min(o["price"] for o in all_offers)
            merged.append(base)

        return merged

    def apply_cursor(self, aggregated, cursor):
        """Filter aggregated list based on cursor for pagination."""
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
        """Generate next cursor for pagination."""
        if len(aggregated) > limit:
            last_item = aggregated[limit - 1]
            return f"{last_item['id']}_{last_item['lowest_price']}"
        return None
