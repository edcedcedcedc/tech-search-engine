from products.crawler.config import REQUIRED_FIELDS_TO_VALIDATE
from decimal import Decimal
from math import isnan
from products.models import Product


class InvalidFetchedProduct(Exception):
    """Raised when fetched product misses critical fields"""

    pass


def validate_fetched_item_or_raise(fetched_item: dict):
    missing = []

    for field in REQUIRED_FIELDS_TO_VALIDATE:
        value = fetched_item.get(field)

        if value is None or value == "":
            missing.append(field)
            continue

        if field == "price":
            try:
                value = Decimal(value)
            except Exception:
                missing.append("price (invalid decimal)")
                continue

            if value < 0 or isnan(value):
                missing.append("price (< 0) or NaN")

        if isinstance(value, str) and not value.strip():
            missing.append(field)

    if missing:
        raise InvalidFetchedProduct(
            f"Missing/invalid required fields: {', '.join(missing)}"
        )


REQUIRED_LANGS = ("ro", "en")


def _has_langs(value: dict, *, field_name: str) -> bool:
    """
    Checks that translation field contains required languages
    with non-empty values.
    """
    if not isinstance(value, dict):
        return False

    for lang in REQUIRED_LANGS:
        v = value.get(lang)
        if not isinstance(v, str) or not v.strip():
            return False

    return True


def is_product_enriched(product: Product) -> bool:
    """
    Product is considered fully enriched if:
    - name exists
    - t_name contains ro + en
    - t_category contains ro + en
    - embedding exists
    """

    # --- name ---
    if not product.name or not product.name.strip():
        return False

    # --- translations ---
    if not _has_langs(product.t_name, field_name="t_name"):
        return False

    if not _has_langs(product.t_category, field_name="t_category"):
        return False

    # --- embedding ---
    if not product.embedding:
        return False

    return True
