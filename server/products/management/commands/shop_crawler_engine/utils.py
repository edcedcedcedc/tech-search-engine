from products.models import (
    ArchivedBrokenProduct,
    ArchivedProduct,
    Product,
)
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from django.db import transaction


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
            # Look up canonical product
            default_item = (
                Product.objects.using("default")
                .filter(shop=shop, external_id=external_id)
                .first()
            )
            archived_item = (
                ArchivedProduct.objects.using("default")
                .filter(shop=shop, external_id=external_id)
                .first()
            )
            archived_broken_item = (
                ArchivedBrokenProduct.objects.using("default")
                .filter(shop=shop, external_id=external_id)
                .first()
            )

            # --------------------------------------------------
            # EXCEPTION FROM COMMON PIPELINE
            # --------------------------------------------------
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

                    # Atomic: create + delete + set fields
                    with transaction.atomic(using=shop):
                        fetched_item.update(
                            dirty=True,
                            change_type="updated",
                            changed_fields=change_info["changed_fields"],
                        )
                        stage_product = Product.objects.using(shop).create(
                            **fetched_item
                        )
                        ArchivedProduct.objects.using(shop).filter(
                            id=archived_item.id
                        ).delete()

                    return stage_product, False, change_info

            if archived_broken_item:
                change_info = ChangeTracker.get_changed_fields(
                    archived_broken_item, fetched_item, fields_to_track
                )
                if change_info["has_changes"]:
                    ChangeTracker.log_changes(
                        fetched_item.get("name", "Unknown"),
                        external_id,
                        shop,
                        change_info,
                    )

                    with transaction.atomic(using=shop):
                        fetched_item.update(
                            dirty=True,
                            change_type="updated",
                            changed_fields=change_info["changed_fields"],
                        )
                        stage_product = Product.objects.using(shop).create(
                            **fetched_item
                        )
                        ArchivedBrokenProduct.objects.using(shop).filter(
                            id=archived_broken_item.id
                        ).delete()

                    return stage_product, False, change_info

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

                    with transaction.atomic(using=shop):
                        fetched_item.update(
                            dirty=True,
                            change_type="updated",
                            changed_fields=change_info["changed_fields"],
                        )
                        stage_product = Product.objects.using(shop).create(
                            **fetched_item
                        )

                    return stage_product, False, change_info

                # No-op crawl → no stage row
                return None, False, {}

            else:
                # --------------------------------------------------
                # NEW PRODUCT
                # --------------------------------------------------
                with transaction.atomic(using=shop):
                    fetched_item.update(
                        dirty=True, change_type="created", changed_fields=None
                    )
                    stage_product = Product.objects.using(shop).create(**fetched_item)

                shop_crawler_log(
                    f"CREATED {stage_product.name} ({stage_product.external_id})"
                )
                return stage_product, True, {}

        except Exception as e:
            shop_crawler_log(
                f"ERROR saving/updating {fetched_item.get('name', 'Unknown')} ({fetched_item.get('external_id')}): {e}"
            )
            return None, False, {}
