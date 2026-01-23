from django.utils import timezone
from products.models import (
    ArchivedBrokenProduct,
    ArchivedProduct,
    Product,
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


class DatabaseManager:
    """Handles product persistence using ChangeTracker"""

    @staticmethod
    def save_or_update_product(fetched_item, fields_to_track=None):
        shop = fetched_item.get("shop")
        external_id = fetched_item.get("external_id")
        price = fetched_item.get("price", 0)
        in_stock = fetched_item.get("in_stock", True)

        if not shop or not external_id:
            shop_crawler_log(f"ERROR: Invalid fetched_item {fetched_item}")
            return None, False, {}

        try:
            ctx = DatabaseManager._load_context(shop, external_id)

            # 1price = 0 → broken
            if price == 0:
                return DatabaseManager._handle_broken(ctx, fetched_item)

            # restore from archive / broken
            restored = DatabaseManager._maybe_restore(
                ctx, fetched_item, fields_to_track
            )
            if restored:
                return restored

            # update active
            if ctx["active"]:
                return DatabaseManager._update_active(
                    ctx["active"], fetched_item, fields_to_track
                )

            # archive OOS (never seen active)
            if not in_stock:
                return DatabaseManager._archive_oos(fetched_item)

            # create new
            return DatabaseManager._create_new(fetched_item)

        except Exception as e:
            shop_crawler_log(
                f"ERROR saving {fetched_item.get('name')} ({external_id}): {e}"
            )
            return None, False, {}

    # ------------------------------------------------------------------
    # Context
    # ------------------------------------------------------------------

    @staticmethod
    def _load_context(shop, external_id):
        return {
            "active": Product.objects.using(PROD_DB)
            .filter(shop=shop, external_id=external_id)
            .first(),
            "archived": ArchivedProduct.objects.using(PROD_DB)
            .filter(shop=shop, external_id=external_id)
            .first(),
            "broken": ArchivedBrokenProduct.objects.using(PROD_DB)
            .filter(shop=shop, external_id=external_id)
            .first(),
        }

    # ------------------------------------------------------------------
    # Handlers
    # ------------------------------------------------------------------

    @staticmethod
    def _handle_broken(ctx, fetched_item):
        if ctx["broken"] or ctx["archived"]:
            return None, False, {}

        if ctx["active"]:
            archived = ctx["active"].archive_broken()
            shop_crawler_log(
                f"ARCHIVED-BROKEN {archived.name} ({archived.external_id})"
            )
        else:
            temp = Product(**fetched_item, in_stock=False, dirty=False)
            temp.archive_broken()

        return None, False, {}

    @staticmethod
    def _maybe_restore(ctx, fetched_item, fields_to_track):
        for source, label in [(ctx["archived"], "archive"), (ctx["broken"], "broken")]:
            if not source:
                continue

            change_info = ChangeTracker.get_changed_fields(
                source, fetched_item, fields_to_track
            )
            if not change_info["has_changes"]:
                return None

            ChangeTracker.log_changes(
                fetched_item.get("name"),
                fetched_item["external_id"],
                fetched_item["shop"],
                change_info,
            )

            fetched_item["dirty"] = True
            restored = Product.objects.using(fetched_item["shop"]).create(
                **fetched_item
            )

            shop_crawler_log(
                f"RESTORED {restored.name} ({restored.external_id}) from {label}"
            )
            return restored, False, change_info

        return None

    @staticmethod
    def _update_active(active, fetched_item, fields_to_track):
        change_info = ChangeTracker.get_changed_fields(
            active, fetched_item, fields_to_track
        )
        if not change_info["has_changes"]:
            return None, False, {}

        ChangeTracker.log_changes(
            fetched_item.get("name"),
            active.external_id,
            fetched_item["shop"],
            change_info,
        )

        for k, v in fetched_item.items():
            setattr(active, k, v)

        active.dirty = True
        active.save(using=fetched_item["shop"])

        return active, False, change_info

    @staticmethod
    def _archive_oos(fetched_item):
        temp = Product(**fetched_item, in_stock=False, dirty=False)
        archived = temp.archive()
        shop_crawler_log(f"ARCHIVED-OOS {archived.name} ({archived.external_id})")
        return archived, False, {}

    @staticmethod
    def _create_new(fetched_item):
        fetched_item["dirty"] = True
        product = Product.objects.using(fetched_item["shop"]).create(**fetched_item)

        shop_crawler_log(f"CREATED {product.name} ({product.external_id})")
        return product, True, {}
