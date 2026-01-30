from decimal import Decimal
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


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
    def get_creation_fields(fetched_data, fields_to_track):
        """
        Treat creation as a diff from None → value
        """
        changed_fields = []
        old_values = {}
        new_values = {}

        for field in fields_to_track:
            if field in fetched_data:
                value = fetched_data[field]
                changed_fields.append(field)
                old_values[field] = None
                new_values[field] = value

        return {
            "has_changes": len(changed_fields) > 0,
            "changed_fields": changed_fields,
            "old_values": old_values,
            "new_values": new_values,
        }

    @staticmethod
    def log_changes(
        product_name, external_id, shop, change_info, *, action=None, source=None
    ):
        """
        action: 'UPDATE' | 'RESTORE'
        source: 'archived' | 'broken' | None
        """
        if not change_info["has_changes"]:
            return

        prefix = []
        if action:
            prefix.append(action)
        if source:
            prefix.append(f"from {source.upper()}")

        prefix_str = f"{' '.join(prefix)} " if prefix else ""

        shop_crawler_log(
            f"{prefix_str}CHANGES for {product_name} ({external_id}) in {shop}: "
            f"{', '.join(change_info['changed_fields'])}"
        )

        for field in change_info["changed_fields"]:
            old_val = change_info["old_values"].get(field)
            new_val = change_info["new_values"].get(field)

            if field == "price":
                old_val = (
                    f"{Decimal(old_val):.2f}" if old_val not in (None, "") else "N/A"
                )
                new_val = (
                    f"{Decimal(new_val):.2f}" if new_val not in (None, "") else "N/A"
                )

            shop_crawler_log(f"  {field}: {old_val} → {new_val}")
