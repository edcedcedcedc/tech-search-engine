import argparse
import environ
import json

from openai import OpenAI
from products.models import Product
from products.constants import categories
from products.utils.log.category_log import category_log
from products.services.normalize_cache import get_cached, set_cached
from django.db import OperationalError, models


def normalize_product(product, client):
    shop = product.shop.lower()
    raw_category = product.category or ""

    if not raw_category.strip():
        return "empty category"

    cached = get_cached(shop, raw_category)
    if cached:
        t_cat = cached.get("normalized", {})
        if t_cat.get("ro") and t_cat.get("en"):
            product.t_category = t_cat
            product.save(update_fields=["t_category"])
            return "reused from cache"

    response = client.chat.completions.create(
        model="gpt-5-nano",
        temperature=1,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a product categorization assistant. "
                    "Choose the best category and return JSON with ro/en/ru fields."
                    f"{categories}"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Product name: {product.name}\n"
                    f"Variant: {product.variant}\n"
                    f"Raw category: {raw_category}\n"
                    'Return JSON only: {"ro": "...", "en": "...", "ru": "..."}'
                ),
            },
        ],
    )

    t_category = json.loads(response.choices[0].message.content)

    if t_category.get("ro") and t_category.get("en"):
        product.category = t_category["ro"]
        product.t_category = t_category
        product.save(update_fields=["category", "t_category"])
        set_cached(shop, raw_category, t_category, product.id)
        return "normalized"

    return "incomplete"


def is_normalized(product: Product) -> bool:
    t_cat = product.t_category or {}
    return bool(t_cat.get("ro") and t_cat.get("en"))


def binary_search_start(qs):
    """Skip already normalized products using binary search by ID"""
    min_id = qs.aggregate(min_id=models.Min("id"))["min_id"]
    max_id = qs.aggregate(max_id=models.Max("id"))["max_id"]
    if not min_id or not max_id:
        return None
    while min_id < max_id:
        mid = (min_id + max_id) // 2
        mid_product = qs.filter(id=mid).first()
        if not mid_product or is_normalized(mid_product):
            min_id = mid + 1
        else:
            max_id = mid
    product = qs.filter(id=min_id).first()
    return min_id if product and not is_normalized(product) else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument(
        "--product-ids",
        default=None,
        help="Comma-separated list of product IDs to normalize",
    )
    args = parser.parse_args()

    env = environ.Env()
    environ.Env.read_env()

    client = OpenAI(api_key=env("OPENAI_API_KEY"))

    qs = Product.objects.using(args.db).filter(dirty=True)

    # Filter by product_ids if provided
    if args.product_ids:
        product_ids = list(map(int, args.product_ids.split(",")))
        qs = qs.filter(id__in=product_ids)

    # --- Binary search to skip already normalized products ---
    start_id = binary_search_start(qs)
    if start_id:
        qs = qs.filter(id__gte=start_id)
        category_log(f"Starting from product ID {start_id}")
    else:
        category_log("All products already normalized")
        return

    # Process products
    for idx, product in enumerate(qs.order_by("id"), 1):
        try:
            result = normalize_product(product, client)
            category_log(f"[{args.db}] {product.id}: {result}")
        except Exception as e:
            category_log(f"[{args.db}] Error normalizing {product.id}: {e}")


if __name__ == "__main__":
    main()
