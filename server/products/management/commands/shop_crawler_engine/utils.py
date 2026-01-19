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

    _oos_counter = {}
    _oos_counter_lock = threading.Lock()
    MAX_OOS_PER_CATEGORY = 20

    @staticmethod
    def reset_oos_counters(categories=None):
        """
        Reset OOS counters at the start of a crawl session.
        If categories list is provided, reset only those categories.
        Otherwise, reset all counters.
        """
        with DatabaseManager._oos_counter_lock:
            if categories:
                for cat in categories:
                    DatabaseManager._oos_counter[cat] = 0
            else:
                DatabaseManager._oos_counter = {}

    @staticmethod
    def save_or_update_product(fetched_item, fields_to_track=None):
        """
        Save or update product in database, tracking changes.

        Returns:
            Tuple: (product_instance, created_bool, change_info_dict)
        """
        shop = fetched_item.get("shop")
        external_id = fetched_item.get("external_id")
        category = fetched_item.get("category", "unknown")
        in_stock = fetched_item.get("in_stock", True)

        if not shop or not external_id or in_stock is None:
            shop_crawler_log(
                f"ERROR: Missing shop{shop} or external_id{external_id} or in_stock is {in_stock} {fetched_item}"
            )
            return None, False, {}

        try:
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
            default_item = (
                Product.objects.using(PROD_DB)
                .filter(shop=shop, external_id=external_id)
                .first()
            )

            # --------------------------------------------------
            # SPECIAL CASE: Price 0 → Archive as broken immediately
            # --------------------------------------------------
            if fetched_item.get("price") == 0:
                try:
                    archived_broken = (
                        ArchivedBrokenProduct.objects.using(PROD_DB)
                        .filter(shop=shop, external_id=external_id)
                        .first()
                    )

                    if not archived_broken:
                        # Try to find existing product for original_id
                        existing_product = (
                            Product.objects.using(PROD_DB)
                            .filter(shop=shop, external_id=external_id)
                            .first()
                        )

                        ArchivedBrokenProduct.objects.using(PROD_DB).create(
                            shop=shop,
                            external_id=external_id,
                            canonical_id="",
                            name=fetched_item.get("name", "Unknown"),
                            variant=fetched_item.get("variant"),
                            price=fetched_item.get("price"),
                            in_stock=fetched_item.get("in_stock", True),
                            archived_at=timezone.now(),
                            # Get original_id from existing product if it exists
                            original_id=(
                                existing_product.id if existing_product else None
                            ),
                        )
                        shop_crawler_log(
                            f"ARCHIVED-BROKEN product {fetched_item.get('name', 'Unknown')} "
                            f"({external_id}) due to price=0"
                        )

                    return None, False, {}
                except Exception as e:
                    shop_crawler_log(
                        f"ERROR archiving broken product {fetched_item.get('name', 'Unknown')} "
                        f"({external_id}): {e}"
                    )
                    return None, False, {}

            # --------------------------------------------------
            # Handle Out-of-Stock threshold only for NEW items
            # --------------------------------------------------
            if not in_stock and not (
                default_item or archived_item or archived_broken_item
            ):
                with DatabaseManager._oos_counter_lock:
                    if category not in DatabaseManager._oos_counter:
                        DatabaseManager._oos_counter[category] = 0

                    if (
                        DatabaseManager._oos_counter[category]
                        >= DatabaseManager.MAX_OOS_PER_CATEGORY
                    ):
                        # Archive immediately - CREATE DIRECTLY instead of calling archive()
                        try:
                            # Create ArchivedProduct directly instead of calling temp_product.archive()
                            ArchivedProduct.objects.using(PROD_DB).create(
                                shop=shop,
                                external_id=external_id,
                                canonical_id="",
                                name=fetched_item.get("name", "Unknown"),
                                variant=fetched_item.get("variant"),
                                price=fetched_item.get("price"),
                                in_stock=False,
                                archived_at=timezone.now(),
                                original_id=None,  # It's a new product, no original
                            )
                            shop_crawler_log(
                                f"ARCHIVED-OOS product {fetched_item.get('name', 'Unknown')} "
                                f"({external_id}) in category '{category}'"
                            )
                            return None, False, {}
                        except Exception as e:
                            shop_crawler_log(
                                f"ERROR archiving OOS product {fetched_item.get('name', 'Unknown')} "
                                f"({external_id}): {e}"
                            )
                            return None, False, {}
                    else:
                        DatabaseManager._oos_counter[category] += 1

            # --------------------------------------------------
            # EXCEPTION FROM COMMON PIPELINE
            # --------------------------------------------------
            # In save_or_update_product, fix the archived_item section:
            if archived_item:
                change_info = ChangeTracker.get_changed_fields(
                    archived_item, fetched_item, fields_to_track
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
                        change_type="restored",  # NEW: "restored" not "updated"
                        changed_fields=change_info["changed_fields"],
                    )

                    # Create Product (restored)
                    stage_product = Product.objects.using(shop).create(**fetched_item)

                    # UPDATE ArchivedProduct (don't delete!)
                    archived_item.price = fetched_item.get("price")
                    archived_item.in_stock = fetched_item.get("in_stock", True)
                    archived_item.save()

                    # Move history BACK to Product
                    ProductPriceHistory.objects.filter(
                        archived_product=archived_item
                    ).update(archived_product=None, product=stage_product)

                    return stage_product, False, change_info

            if archived_broken_item:
                change_info = ChangeTracker.get_changed_fields(
                    archived_broken_item, fetched_item, fields_to_track
                )

                # Only restore if NOT broken anymore (price > 0)
                if change_info["has_changes"] and fetched_item.get("price", 0) > 0:
                    ChangeTracker.log_changes(
                        fetched_item.get("name", "Unknown"),
                        external_id,
                        shop,
                        change_info,
                    )

                    fetched_item.update(
                        dirty=True,
                        change_type="restored_from_broken",  # DIFFERENT
                        changed_fields=change_info["changed_fields"],
                    )

                    stage_product = Product.objects.using(shop).create(**fetched_item)

                    # UPDATE ArchivedBrokenProduct
                    archived_broken_item.price = fetched_item.get("price")
                    archived_broken_item.in_stock = fetched_item.get("in_stock", True)
                    archived_broken_item.save()

                    return stage_product, False, change_info

                # If still broken, keep archived
                return None, False, {}

            # --------------------------------------------------
            # EXISTING PRODUCT
            # --------------------------------------------------
            elif default_item:
                change_info = ChangeTracker.get_changed_fields(
                    default_item, fetched_item, fields_to_track
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
                    stage_product = Product.objects.using(shop).create(**fetched_item)

                    return stage_product, False, change_info

                return None, False, {}

            else:
                # --------------------------------------------------
                # NEW PRODUCT
                # --------------------------------------------------
                fetched_item.update(
                    dirty=True, change_type="created", changed_fields=None
                )
                stage_product = Product.objects.using(shop).create(**fetched_item)

                shop_crawler_log(
                    f"TO BE CREATED {stage_product.name} ({stage_product.external_id})"
                )
                return stage_product, True, {}

        except Exception as e:
            shop_crawler_log(
                f"ERROR saving/updating {fetched_item.get('name', 'Unknown')} ({fetched_item.get('external_id')}): {e}"
            )
            return None, False, {}


def random_sleep(min_seconds: float = 2, max_seconds: float = 5):
    """
    Sleeps a random duration and logs it to the same aggregation log file.
    """
    sleep_time = random.uniform(min_seconds, max_seconds)
    time.sleep(sleep_time)
