from django.utils import timezone
import random
import threading
import time
from products.models import (
    ArchivedBrokenProduct,
    ArchivedProduct,
    Product,
    ProductPriceHistory,
)
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from products.management.commands.shop_crawler_engine.config import PROD_DB, STAGE_DB


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

                # Special handling for boolean values
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


from django.utils import timezone
import threading
from products.models import (
    ArchivedBrokenProduct,
    ArchivedProduct,
    Product,
    ProductPriceHistory,
)
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from products.management.commands.shop_crawler_engine.config import PROD_DB


class DatabaseManager:
    """Handles database operations for products in a linear DAG style using ChangeTracker"""

    @staticmethod
    def save_or_update_product(fetched_item, fields_to_track=None):
        shop = fetched_item.get("shop")
        external_id = fetched_item.get("external_id")
        category = fetched_item.get("category", "unknown")
        in_stock = fetched_item.get("in_stock", True)

        if not shop or not external_id or in_stock is None:
            shop_crawler_log(
                f"ERROR: Missing shop {shop} or external_id {external_id} or in_stock={in_stock} {fetched_item}"
            )
            return None, False, {}

        try:
            # Fetch DB entries
            archived_broken_item = (
                ArchivedBrokenProduct.objects.using(PROD_DB)
                .filter(shop=shop, external_id=external_id)
                .first()
            )
            archived_item = (
                ArchivedProduct.objects.using(PROD_DB)
                .filter(shop=shop, external_id=external_id)
                .first()
            )
            active_item = (
                Product.objects.using(PROD_DB)
                .filter(shop=shop, external_id=external_id)
                .first()
            )

            # -----------------------------
            # Price=0 → archive broken, create price history node
            # -----------------------------
            if fetched_item.get("price", 0) == 0:
                # check if already archived anywhere
                if not archived_broken_item and not archived_item:
                    if active_item:
                        archived = active_item.archive_broken()
                        name = active_item.name
                        ext_id = active_item.external_id
                    else:
                        # create a temp product to archive
                        temp_product = Product(
                            name=fetched_item.get("name", "Unknown"),
                            variant=fetched_item.get("variant"),
                            price=0,
                            external_id=fetched_item["external_id"],
                            shop=fetched_item.get("shop"),
                            in_stock=False,
                            dirty=False,
                        )
                        archived = temp_product.archive_broken()
                        name = temp_product.name
                        ext_id = temp_product.external_id

                    shop_crawler_log(
                        f"ARCHIVED-BROKEN product {name} ({ext_id}) due to price=0"
                    )
                return None, False, {}

            # -----------------------------
            # in_stock false -> archived, create price history node
            # -----------------------------
            if not in_stock and not (
                active_item or archived_item or archived_broken_item
            ):
                temp_product = Product(
                    shop=shop,
                    external_id=external_id,
                    canonical_id="",
                    name=fetched_item.get("name", "Unknown"),
                    variant=fetched_item.get("variant"),
                    price=fetched_item.get("price"),
                    url=fetched_item.get("url", ""),
                    in_stock=False,
                    dirty=False,
                )
                archived = temp_product.archive()
                shop_crawler_log(
                    f"ARCHIVED-OOS product {fetched_item.get('name', 'Unknown')} ({external_id}) category='{category}'"
                )
                return archived, False, {}

            # -----------------------------
            # Restore from archive or broken
            # -----------------------------
            for db_item, reason in [
                (archived_item, "archive"),
                (archived_broken_item, "broken"),
            ]:
                if db_item and (
                    reason == "broken"
                    and fetched_item.get("price", 0) > 0
                    or reason == "archive"
                ):
                    change_info = ChangeTracker.get_changed_fields(
                        db_item, fetched_item, fields_to_track
                    )
                    if change_info["has_changes"]:
                        ChangeTracker.log_changes(
                            fetched_item.get("name", "Unknown"),
                            external_id,
                            shop,
                            change_info,
                        )
                        fetched_item["dirty"] = True
                        restored = Product.objects.using(shop).create(**fetched_item)

                        ProductPriceHistory.link_to_product(
                            ProductPriceHistory.objects.using(shop).filter(
                                archived_product=db_item
                            ),
                            restored,
                        )
                        shop_crawler_log(
                            f"RESTORED product {external_id} from {reason}"
                        )
                        return restored, False, change_info
                    return None, False, {}

            # -----------------------------
            # Update active product
            # -----------------------------
            if active_item:
                change_info = ChangeTracker.get_changed_fields(
                    active_item, fetched_item, fields_to_track
                )
                if change_info["has_changes"]:
                    ChangeTracker.log_changes(
                        fetched_item.get("name", "Unknown"),
                        external_id,
                        shop,
                        change_info,
                    )
                    fetched_item.update(
                        dirty=True,
                        change_type="updated",
                        changed_fields=change_info["changed_fields"],
                    )
                    updated_product = Product.objects.using(shop).create(**fetched_item)
                    return updated_product, False, change_info
                return None, False, {}

            # -----------------------------
            # Create new product
            # -----------------------------
            fetched_item["dirty"] = True
            new_product = Product.objects.using(shop).create(**fetched_item)
            shop_crawler_log(
                f"CREATED new product {new_product.name} ({new_product.external_id})"
            )
            return new_product, True, {}

        except Exception as e:
            shop_crawler_log(
                f"ERROR saving/updating {fetched_item.get('name', 'Unknown')} ({fetched_item.get('external_id')}): {e}"
            )
            return None, False, {}
