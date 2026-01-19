from openai import OpenAI
from django.utils import timezone
from collections import defaultdict
import json
from products.constants import categories
from products.models import Product
from products.utils.log.category_log import category_log
from .normalize_cache import (
    load_cache,
    save_cache,
    get_cached,
    set_cached,
)


def normalize_category_for_product(
    product_id: int,
    db="default",
    *,
    skip_audit=False,
    client: OpenAI | None = None,
):
    product = Product.objects.using(db).get(id=product_id)
    shop_category_before = product.category or ""
    raw_category = shop_category_before
    shop = product.shop.lower()

    if not raw_category.strip():
        return "empty category"

    # ---------- AUDIT ----------
    if not skip_audit:
        cached = get_cached(shop, shop_category_before)
        if cached:
            if product.category != cached["normalized"]["ro"]:
                product.category = cached["normalized"]["ro"]
                product.t_category = cached["normalized"]
                product.save(using=db)

            return "reused from audit"
        else:
            # ---------- SKIP ----------
            if product.category in [c["en"] for c in categories]:
                return "already normalized"

            # ---------- OPENAI ----------
            if client is None:
                raise RuntimeError("OpenAI client required")

            response = client.chat.completions.create(
                model="gpt-5-nano",
                temperature=1,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a product categorization assistant. "
                            "Choose best category and return JSON ro/en/ru."
                            "If no suitable match exists, propose a new category in the same format. "
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

            product.category = t_category["ro"]
            product.t_category = t_category
            product.save(using=db)

            set_cached(shop, shop_category_before, t_category, product.id)

            return "normalized"
