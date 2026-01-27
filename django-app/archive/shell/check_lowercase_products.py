from products.models import Product


def check_lowercase_products(limit=10):
    """
    Finds products where name or variant is fully lowercase.
    Returns (total_count, sample_products)
    """
    dirty_products = []

    all_products = Product.objects.all()
    for p in all_products:
        raw_name = p.name or ""
        raw_variant = p.variant or ""

        if raw_name.islower() or raw_variant.islower():
            dirty_products.append(
                {
                    "id": p.id,
                    "name": raw_name,
                    "variant": raw_variant,
                    "instance": p,  # optional, for future fix
                }
            )

    print(
        f"Found {len(dirty_products)} lowercase products out of {all_products.count()}"
    )

    return len(dirty_products), dirty_products[:limit]  # first few samples
