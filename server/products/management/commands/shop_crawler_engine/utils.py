from products.models import Product
from products.utils.shop_crawler_engine_log import random_sleep, shop_crawler_log
import requests


class RateLimiter:
    """Handle rate limiting and retries for HTTP requests"""

    def __init__(self):
        self.times_429 = 0

    def handle_429(self):
        """Handle 429 Too Many Requests responses"""
        self.times_429 += 1
        shop_crawler_log(f"Received 429 response (times: {self.times_429})")

        if self.times_429 == 2:
            random_sleep(60, 120)
        elif self.times_429 == 3:
            random_sleep(900, 1000)  # 15-17 minutes
        else:
            random_sleep(30, 60)

    def make_request(self, url, timeout=15):
        """Make HTTP request with rate limiting handling"""
        try:
            resp = requests.get(url, timeout=timeout)

            if resp.status_code == 429:
                self.handle_429()
                # Optionally retry once after handling 429
                random_sleep(5, 10)
                resp = requests.get(url, timeout=timeout)

            resp.raise_for_status()
            return resp

        except requests.exceptions.RequestException as e:
            shop_crawler_log(f"Request failed for {url}: {e}")
            return None


class ChangeTracker:
    """Track changes in product fields between fetched data and database"""

    @staticmethod
    def get_changed_fields(db_product, fetched_data, fields_to_track=None):
        if fields_to_track is None:
            fields_to_track = ["price", "name", "variant", "in_stock"]

        changed_fields = []
        old_values = {}
        new_values = {}

        for field in fields_to_track:
            if field in fetched_data:
                db_value = getattr(db_product, field, None)
                fetched_value = fetched_data[field]

                # Special handling for different data types
                if isinstance(db_value, bool) or isinstance(fetched_value, bool):
                    if bool(db_value) != bool(fetched_value):
                        changed_fields.append(field)
                        old_values[field] = db_value
                        new_values[field] = fetched_value
                elif str(db_value) != str(fetched_value):
                    changed_fields.append(field)
                    old_values[field] = db_value
                    new_values[field] = fetched_value

        return {
            "has_changes": len(changed_fields) > 0,
            "changed_fields": changed_fields,
            "old_values": old_values,
            "new_values": new_values,
        }

    @staticmethod
    def log_changes(product_name, external_id, shop, change_info):
        """Log changes for a product"""
        if change_info["has_changes"]:
            shop_crawler_log(
                f"CHANGES detected for {product_name} ({external_id}) in {shop}: "
                f"{', '.join(change_info['changed_fields'])}"
            )
            for field in change_info["changed_fields"]:
                shop_crawler_log(
                    f"  {field}: {change_info['old_values'].get(field)} → "
                    f"{change_info['new_values'].get(field)}"
                )


class DatabaseManager:
    """Handle database operations for products"""

    @staticmethod
    def save_or_update_product(fetched_item, fields_to_track=None):
        """
        Save or update product in database, tracking changes.

        Returns:
            Tuple: (product_instance, created_bool, change_info_dict)
        """
        shop = fetched_item.get("shop")
        external_id = fetched_item.get("external_id")

        if not shop or not external_id:
            shop_crawler_log(f"ERROR: Missing shop or external_id in {fetched_item}")
            return None, False, {}

        try:
            # Try to get existing product
            db_product = (
                Product.objects.using(shop)
                .filter(shop=shop, external_id=external_id)
                .first()
            )

            if db_product:
                # Check for changes
                change_info = ChangeTracker.get_changed_fields(
                    db_product, fetched_item, fields_to_track
                )

                # Update only if there are changes
                if change_info["has_changes"]:
                    ChangeTracker.log_changes(
                        fetched_item.get("name", "Unknown"),
                        external_id,
                        shop,
                        change_info,
                    )

                    # Update the product with fetched data
                    for key, value in fetched_item.items():
                        if hasattr(db_product, key):
                            setattr(db_product, key, value)

                    db_product.save(using=shop)
                    return db_product, False, change_info
                else:
                    return db_product, False, {}

            else:
                # Create new product
                product = Product.objects.using(shop).create(**fetched_item)
                shop_crawler_log(f"CREATED {fetched_item.get('name', 'Unknown')}")
                return product, True, {}

        except Exception as e:
            shop_crawler_log(
                f"ERROR saving/updating {fetched_item.get('name', 'Unknown')}: {e}"
            )
            return None, False, {}
