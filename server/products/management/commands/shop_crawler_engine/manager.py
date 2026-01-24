from decimal import Decimal
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

                # --- Normalize numeric values ---
                if field == "price":
                    try:
                        db_value = Decimal(db_value)
                    except:
                        db_value = Decimal(0)
                    try:
                        fetched_value = Decimal(fetched_value)
                    except:
                        fetched_value = Decimal(0)

                # --- Boolean comparison ---
                if isinstance(db_value, bool) or isinstance(fetched_value, bool):
                    if bool(db_value) != bool(fetched_value):
                        changed_fields.append(field)
                        old_values[field] = db_value
                        new_values[field] = fetched_value
                # --- String/other comparison ---
                elif db_value != fetched_value:
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
    def state_machine(fetched_item, fields_to_track=None):
        shop = fetched_item.get("shop") or ""
        external_id = fetched_item.get("external_id") or ""
        fetched_item["price"] = Decimal(fetched_item.get("price", 0))
        in_stock = fetched_item.get("in_stock", True)

        if not shop or not external_id:
            shop_crawler_log(f"ERROR: Invalid fetched_item {fetched_item}")
            return None, False, {}

        try:
            ctx = DatabaseManager._load_context(shop, external_id)

            # Determine "seen count"
            if ctx["active"] or ctx["archived"] or ctx["broken"]:
                seen_count = 2  # subsequent crawl
            else:
                seen_count = 1  # first crawl

            # ---------- STATE MACHINE ----------

            # Price is zero → BROKEN always wins
            if fetched_item["price"] == 0:
                return DatabaseManager._handle_broken(ctx, fetched_item)

            # in_stock == true → ACTIVE
            if in_stock:
                if seen_count == 1:
                    # First crawl → create ACTIVE
                    if ctx["active"]:
                        return DatabaseManager._update_active(
                            ctx["active"], fetched_item, fields_to_track
                        )
                    return DatabaseManager._create_new(fetched_item)
                else:
                    # Subsequent crawl
                    if ctx["archived"]:
                        return DatabaseManager._maybe_restore(
                            ctx["archived"], fetched_item
                        )
                    if ctx["active"]:
                        return DatabaseManager._update_active(
                            ctx["active"], fetched_item, fields_to_track
                        )
                    return DatabaseManager._create_new(fetched_item)

            # in_stock == false → ARCHIVED / ACTIVE
            else:
                if seen_count == 1:
                    # First crawl → ARCHIVED
                    return DatabaseManager._archive_oos(fetched_item)
                else:
                    # Subsequent crawl
                    if ctx["archived"]:
                        # Already archived → do nothing
                        return None, False, {}
                    if ctx["active"]:
                        # If not archived → keep ACTIVE
                        return DatabaseManager._update_active(
                            ctx["active"], fetched_item, fields_to_track
                        )
                    # Fresh OOS not in DB yet → create ACTIVE
                    return DatabaseManager._create_new(fetched_item)

        except Exception as e:
            pname = fetched_item.get("name") or ""
            shop_crawler_log(f"ERROR saving {pname} ({external_id}): {e}")
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
        try:
            if ctx["broken"] or ctx["archived"]:
                return None, False, {}

            if ctx["active"]:
                archived = ctx["active"].archive_broken()
                name = getattr(archived, "name", "")
                ext = getattr(archived, "external_id", "")
                shop_crawler_log(f"ARCHIVED-BROKEN {name} ({ext})")
            else:
                temp = Product(**fetched_item, dirty=False)
                archived_broken = temp.archive_broken()
                name = getattr(archived_broken, "name", "")
                ext = getattr(archived_broken, "external_id", "")
                shop_crawler_log(f"ARCHIVED-BROKEN {name} ({ext})")
        except Exception as e:
            shop_crawler_log(f"ERROR logging ARCHIVED-BROKEN: {e}")

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

            try:
                ChangeTracker.log_changes(
                    fetched_item.get("name") or "",
                    fetched_item.get("external_id") or "",
                    fetched_item.get("shop") or "",
                    change_info,
                )
            except Exception as e:
                shop_crawler_log(f"ERROR logging changes for restore: {e}")

            fetched_item["dirty"] = True
            restored = Product.objects.using(fetched_item.get("shop")).create(
                **fetched_item
            )
            try:
                shop_crawler_log(
                    f"RESTORED {getattr(restored, 'name', '')} ({getattr(restored, 'external_id', '')})"
                )
            except Exception as e:
                shop_crawler_log(f"ERROR logging RESTORED product: {e}")

            return restored, False, change_info

        return None

    @staticmethod
    def _update_active(active, fetched_item, fields_to_track):
        change_info = ChangeTracker.get_changed_fields(
            active, fetched_item, fields_to_track
        )
        if not change_info["has_changes"]:
            return None, False, {}

        try:
            ChangeTracker.log_changes(
                fetched_item.get("name") or "",
                getattr(active, "external_id", ""),
                fetched_item.get("shop") or "",
                change_info,
            )
        except Exception as e:
            shop_crawler_log(f"ERROR logging changes for update_active: {e}")

        for k, v in fetched_item.items():
            setattr(active, k, v)

        active.dirty = True
        active.save(using=fetched_item.get("shop"))

        return active, False, change_info

    @staticmethod
    def _archive_oos(fetched_item):
        temp = Product(**fetched_item, dirty=False)
        archived = temp.archive()
        try:
            shop_crawler_log(
                f"ARCHIVED-OOS {getattr(archived, 'name', '')} ({getattr(archived, 'external_id', '')})"
            )
        except Exception as e:
            shop_crawler_log(f"ERROR logging ARCHIVED-OOS: {e}")
        return archived, False, {}

    @staticmethod
    def _create_new(fetched_item):
        fetched_item["dirty"] = True
        product = Product.objects.using(fetched_item.get("shop")).create(**fetched_item)
        try:
            shop_crawler_log(
                f"CREATED {getattr(product, 'name', '')} ({getattr(product, 'external_id', '')})"
            )
        except Exception as e:
            shop_crawler_log(f"ERROR logging CREATED product: {e}")
        return product, True, {}
