from decimal import Decimal
from products.models import (
    ArchivedBrokenProduct,
    ArchivedProduct,
    Product,
)
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from products.crawler.config import PROD_DB, STAGE_DB, UPDATE_DB
from products.crawler.validate import (
    is_product_enriched,
    validate_fetched_item_or_raise,
    InvalidFetchedProduct,
)
from products.crawler.config import MAX_VALIDATION_ERRORS
from products.crawler.tracker import ChangeTracker


class DatabaseManager:
    """Handles product persistence using ChangeTracker"""

    _validation_error_count = 0

    @staticmethod
    def state_machine(fetched_item, fields_to_track=None):
        shop = fetched_item.get("shop") or ""
        external_id = fetched_item.get("external_id") or ""
        fetched_item["price"] = Decimal(fetched_item.get("price", 0))
        in_stock = fetched_item.get("in_stock", True)

        try:
            validate_fetched_item_or_raise(fetched_item)
        except InvalidFetchedProduct as e:
            # increment counter
            DatabaseManager._validation_error_count += 1

            shop_crawler_log(
                f"VALIDATION ERROR {DatabaseManager._validation_error_count}/{MAX_VALIDATION_ERRORS} "
                f"{shop=} {external_id=} → {e}"
            )
            DatabaseManager._force_broken_from_validation(fetched_item, reason=str(e))

            if DatabaseManager._validation_error_count >= MAX_VALIDATION_ERRORS:
                raise

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
                            ctx, fetched_item, fields_to_track
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
        """
        Restore an archived/broken product as a new object in Stage DB.
        Copies all fields from archived/broken + changed fields from fetched_item.
        Preserves translations from existing archived/broken product if present.
        Marks dirty=True so the pipeline can pick it up.
        """
        shop = fetched_item.get("shop")
        external_id = fetched_item.get("external_id")

        for source, label in [(ctx["archived"], "archive"), (ctx["broken"], "broken")]:
            if not source:
                continue

            change_info = ChangeTracker.get_changed_fields(
                db_product=source,
                fetched_data=fetched_item,
                fields_to_track=fields_to_track,
            )
            if not change_info["has_changes"]:
                return None, False, {}

            # --- Log all field changes once ---
            try:
                ChangeTracker.log_changes(
                    fetched_item.get("name") or "",
                    external_id or "",
                    shop or "",
                    change_info,
                    action="RESTORE",
                    source=label,
                )
            except Exception as e:
                shop_crawler_log(f"ERROR logging changes for restore: {e}")

            # TODO This updates are redundant because Archived isnt a source of truth for now!!!
            # --- Build restored data from archived/broken ---
            restored_data = {
                f.name: getattr(source, f.name)
                for f in Product._meta.fields
                if f.name not in ("id", "pk", "created_at", "updated_at")
            }

            # --- Preserve translations from the archived/broken source itself ---
            restored_data["t_name"] = getattr(source, "t_name", {})
            restored_data["t_variant"] = getattr(source, "t_variant", {})
            restored_data["t_category"] = getattr(source, "t_category", {})

            # --- Overlay fetched crawler fields (price, name, variant, etc.) ---
            restored_data.update(fetched_item)

            # --- Mark dirty for downstream ---
            restored_data["dirty"] = True

            restored = Product.objects.using(shop).create(**restored_data)

            return restored, False, change_info

        return None, False, {}

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
                action="UPDATE",
            )
        except Exception as e:
            shop_crawler_log(f"ERROR logging changes for update_active: {e}")

        # --- Preserve translations (crawler is NOT authoritative) ---
        preserved_t_name = active.t_name
        preserved_t_variant = active.t_variant
        preserved_t_category = active.t_category

        # --- Apply crawler updates ---
        for k, v in fetched_item.items():
            setattr(active, k, v)

        # --- Restore translations unless explicitly provided ---
        active.t_name = preserved_t_name
        active.t_variant = preserved_t_variant
        active.t_category = preserved_t_category
        active.dirty = True

        if is_product_enriched(active):
            active.save(using=UPDATE_DB)
        else:
            active.save(using=fetched_item.get("shop"))

        return active, False, change_info

    @staticmethod
    def _archive_oos(fetched_item):
        temp = Product(**fetched_item, dirty=False)
        archived = temp.archive()
        try:
            shop_crawler_log(
                f"ARCHIVED-OOS {getattr(archived, 'name', '')} ({getattr(archived, 'external_id', '')})  shop={getattr(archived, 'shop', '')}"
            )
        except Exception as e:
            shop_crawler_log(f"ERROR logging ARCHIVED-OOS: {e}")
        return archived, False, {}

    @staticmethod
    def _create_new(fetched_item):
        product = None
        try:
            fetched_item["dirty"] = True
            product = Product.objects.using(fetched_item.get("shop")).create(
                **fetched_item
            )
            change_info = ChangeTracker.get_creation_fields(
                fetched_item,
                fields_to_track=["price", "name", "variant", "in_stock"],
            )

            ChangeTracker.log_changes(
                product_name=getattr(product, "name", ""),
                external_id=getattr(product, "external_id", ""),
                shop=getattr(product, "shop", ""),
                change_info=change_info,
                action="CREATE",
            )
        except Exception as e:
            shop_crawler_log(f"ERROR logging CREATED product: {e}")

        return product, True, {}

    @staticmethod
    def _force_broken_from_validation(fetched_item, reason=""):
        try:
            temp = Product(**fetched_item, dirty=False)
            archived = temp.archive_broken()
            shop_crawler_log(
                f"ARCHIVED-BROKEN VALIDATION "
                f"{getattr(archived, 'name', '')} "
                f"({getattr(archived, 'external_id', '')}) "
                f"reason={reason}"
            )
        except Exception as e:
            shop_crawler_log(f"FATAL Failed to archive broken product: {e}")
