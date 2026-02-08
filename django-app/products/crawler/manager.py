from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from products.models import (
    ArchivedBrokenProduct,
    ArchivedProduct,
    Product,
)
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from products.crawler.config import (
    PROD_DB,
    UPDATE_DB,
)
from products.crawler.validate import (
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

            seen_count = 2 if ctx["active"] or ctx["archived"] or ctx["broken"] else 1

            # ---------- STATE MACHINE ----------
            if fetched_item["price"] == 0:
                return DatabaseManager._handle_broken(ctx, fetched_item)

            if in_stock:
                if seen_count == 1:
                    if ctx["active"]:
                        return DatabaseManager._update_active(
                            ctx["active"], fetched_item, fields_to_track
                        )
                    return DatabaseManager._create_new(fetched_item, fields_to_track)
                else:
                    if ctx["active"]:
                        return DatabaseManager._update_active(
                            ctx["active"], fetched_item, fields_to_track
                        )
                    if not ctx["active"] and (ctx["archived"] or ctx["broken"]):
                        return DatabaseManager._maybe_restore(
                            ctx, fetched_item, fields_to_track
                        )
                    return DatabaseManager._create_new(fetched_item, fields_to_track)
            else:
                if seen_count == 1:
                    return DatabaseManager._archive_oos(fetched_item)
                else:
                    if ctx["active"]:
                        return DatabaseManager._update_active(
                            ctx["active"], fetched_item, fields_to_track
                        )
                    if ctx["archived"]:
                        return None, False, {}
                    return DatabaseManager._create_new(fetched_item, fields_to_track)
        except Exception as e:
            pname = fetched_item.get("name") or ""
            shop_crawler_log(f"ERROR saving {pname} ({external_id}): {e}")
            return None, False, {}

    # ------------------ CONTEXT ------------------

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

    # ------------------ HANDLERS ------------------

    @staticmethod
    def _handle_broken(ctx, fetched_item):
        try:
            if ctx["broken"] or ctx["archived"]:
                return None, False, {}
            if ctx["active"]:
                archived = ctx["active"].archive_broken()
                shop_crawler_log(
                    f"ARCHIVED-BROKEN {archived.name} ({archived.external_id})"
                )
            else:
                temp = Product(**fetched_item, dirty=False)
                archived_broken = temp.archive_broken()
                shop_crawler_log(
                    f"ARCHIVED-BROKEN {archived_broken.name} ({archived_broken.external_id})"
                )
        except Exception as e:
            shop_crawler_log(f"ERROR logging ARCHIVED-BROKEN: {e}")
        return None, False, {}

    @staticmethod
    def _maybe_restore(ctx, fetched_item, fields_to_track):
        """Restore product from immutable archive/broken row"""
        shop = fetched_item.get("shop")
        external_id = fetched_item.get("external_id")

        source = ctx.get("archived") or ctx.get("broken")
        source_label = "archive" if ctx.get("archived") else "broken"
        if not source:
            return None, False, {}

        baseline = {
            "price": source.price,
            "in_stock": source.in_stock,
            "name": source.name,
            "variant": source.variant,
        }
        change_info = ChangeTracker.get_changed_fields(
            baseline, fetched_item, fields_to_track
        )
        if not change_info["has_changes"]:
            return None, False, {}

        try:
            ChangeTracker.log_changes(
                fetched_item.get("name") or "",
                external_id or "",
                shop or "",
                change_info,
                action="RESTORE",
                source=source_label,
            )
        except Exception as e:
            shop_crawler_log(f"ERROR logging changes for restore: {e}")

        name_changed = "name" in change_info["changed_fields"]
        variant_changed = "variant" in change_info["changed_fields"]

        restored_product_data = {
            "external_id": external_id,
            "shop": shop,
            "name": fetched_item.get("name"),
            "variant": fetched_item.get("variant"),
            "price": fetched_item.get("price"),
            "in_stock": fetched_item.get("in_stock"),
            "brand": source.brand,
            "category": source.category,
            "url": fetched_item.get("url", source.url),
            "image": fetched_item.get("image", source.image),
            "dirty": True,
            "created_at": timezone.now(),
            "updated_at": timezone.now(),
            "t_name": {} if name_changed else source.t_name or {},
            "t_variant": ({} if variant_changed else source.t_variant or {}),
            "t_category": source.t_category,
            "embedding": None if name_changed or variant_changed else source.embedding,
        }

        restored = Product.objects.using(shop).create(**restored_product_data)

        # Create new archive snapshot
        with transaction.atomic(using=shop):
            ArchivedProduct.objects.using(shop).filter(
                shop=shop, external_id=external_id
            ).delete()
            ArchivedProduct.objects.using(shop).create(
                original_id=source.original_id,
                external_id=external_id,
                similar_id=source.similar_id,
                identical_id=source.identical_id,
                name=fetched_item.get("name"),
                variant=fetched_item.get("variant"),
                embedding=None,
                brand=source.brand,
                category=source.category,
                t_name=restored_product_data["t_name"],
                t_variant=restored_product_data["t_variant"],
                t_category=restored_product_data["t_category"],
                url=restored_product_data["url"],
                image=restored_product_data["image"],
                price=fetched_item.get("price"),
                in_stock=True,
                shop=shop,
                archived_at=timezone.now(),
                dirty=False,
            )

        return restored, False, change_info

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

        active.dirty = True

        if "name" in change_info["changed_fields"]:
            active.name = fetched_item["name"]
            active.t_name = {}
        if "variant" in change_info["changed_fields"]:
            active.variant = fetched_item["variant"]
            active.t_variant = {}
        if "category" in change_info["changed_fields"]:
            active.category = fetched_item["category"]
            active.t_category = {}
        if "url" in change_info["changed_fields"]:
            active.url = fetched_item["url"]
        if "brand" in change_info["changed_fields"]:
            active.brand = fetched_item["brand"]
        if "price" in change_info["changed_fields"]:
            active.price = fetched_item["price"]
        if "in_stock" in change_info["changed_fields"]:
            active.in_stock = fetched_item["in_stock"]

        stock_or_price_or_url = any(
            f in change_info["changed_fields"] for f in ["in_stock", "price", "url"]
        )
        name_or_variant_or_category_brand = any(
            f in change_info["changed_fields"]
            for f in ["name", "variant", "category", "brand"]
        )

        if stock_or_price_or_url and not name_or_variant_or_category_brand:
            active.save(using=UPDATE_DB)
        else:
            active.embedding = None
            active.save(using=fetched_item.get("shop"))

        return active, False, change_info

    @staticmethod
    def _archive_oos(fetched_item):
        temp = Product(**fetched_item, dirty=False)
        archived = temp.archive()
        try:
            shop_crawler_log(
                f"ARCHIVED-OOS {archived.name} ({archived.external_id})  shop={archived.shop}"
            )
        except Exception as e:
            shop_crawler_log(f"ERROR logging ARCHIVED-OOS: {e}")
        return archived, False, {}

    @staticmethod
    def _create_new(fetched_item, fields_to_track):
        product = None
        try:
            fetched_item["dirty"] = True
            product = Product.objects.using(fetched_item.get("shop")).create(
                **fetched_item
            )
            change_info = ChangeTracker.get_creation_fields(
                fetched_item,
                fields_to_track=fields_to_track,
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
                f"ARCHIVED-BROKEN VALIDATION {archived.name} ({archived.external_id}) reason={reason}"
            )
        except Exception as e:
            shop_crawler_log(f"FATAL Failed to archive broken product: {e}")
