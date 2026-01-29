from products.crawler.config import REQUIRED_FIELDS_TO_VALIDATE
from decimal import Decimal
from math import isnan


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
