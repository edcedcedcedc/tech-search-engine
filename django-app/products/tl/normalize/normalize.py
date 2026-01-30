from openai import OpenAI
import json
from products.constants import categories
from products.models import Product
from products.utils.log.category_log import category_log
from .normalize_cache import get_cached, set_cached


def normalize_category_for_product(
    product_id: int,
    db="default",
    *,
    skip_audit=False,
    client: OpenAI | None = None,
):
    product = Product.objects.using(db).get(id=product_id)
    shop = product.shop.lower()
    raw_category = product.category or ""

    # If no category at all, skip
    if not raw_category.strip():
        return "empty category"

    # ---------- AUDIT / CACHE ----------
    if not skip_audit:
        # ---------- SKIP IF ALREADY NORMALIZED ----------
        if (
            product.category
            and product.t_category.get("ro")
            and product.t_category.get("en")
        ):
            return "already normalized"

        cached = get_cached(shop, raw_category)
        if cached:
            t_cat = cached.get("normalized", {})
            # Only accept if ro and en exist
            if t_cat.get("ro") and t_cat.get("en"):
                product.t_category = t_cat
                product.save(using=db)
                return "reused from audit"

    # ---------- OPENAI CALL ----------
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

    # Parse response safely
    try:
        t_category = json.loads(response.choices[0].message.content)
    except Exception as e:
        category_log(f"[{db}] Error parsing GPT response for product {product.id}: {e}")
        return "error parsing response"

    # Only save if ro and en are populated
    if t_category.get("ro") and t_category.get("en"):
        product.category = t_category["ro"]
        product.t_category = t_category
        product.save(using=db)
        set_cached(shop, raw_category, t_category, product.id)
        return "normalized"
    else:
        category_log(
            f"[{db}] Incomplete t_category for product {product.id}: {t_category}"
        )
        return "incomplete t_category"
