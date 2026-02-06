import time
import signal
from products.models import Product
from products.utils.log.db_merge_log import db_merge_log
from products.crawler.config import ALLOWED_FIELDS_TO_WRITE
from django.utils import timezone

BATCH_SIZE = 2000
STOP_MERGE = False


def signal_handler(sig, frame):
    global STOP_MERGE
    print("\nReceived Ctrl+C, stopping merge gracefully...")
    db_merge_log("INTERRUPTED by user (Ctrl+C)")
    STOP_MERGE = True


signal.signal(signal.SIGINT, signal_handler)


class ProductDBMerger:
    """
    High-performance merge between product databases (dirty only, dirty=True).
    Pure Python class version, preserves all logic and semantics.
    """

    def __init__(self, source, dest="default", shop=None, force=False):
        self.source_db = source
        self.dest_db = dest
        self.shop = shop.lower() if shop else None
        self.force_merge = force

    def run(self):
        global STOP_MERGE
        start_time = time.time()
        db_merge_log(
            f"[DIRTY] Starting merge {self.source_db} → {self.dest_db} | shop={self.shop}"
        )

        # Preload destination products for fast lookup
        dest_map = {
            (p.shop.lower(), p.external_id): p
            for p in Product.objects.using(self.dest_db).filter(shop__iexact=self.shop)
        }

        if self.force_merge:
            src_qs = Product.objects.using(self.source_db).filter(
                shop__iexact=self.shop
            )
        else:
            src_qs = Product.objects.using(self.source_db).filter(
                shop__iexact=self.shop, dirty=True
            )

        to_create = []
        to_update = []
        update_fields_union = set()
        processed_ids = []

        for src in src_qs.iterator(chunk_size=BATCH_SIZE):
            if STOP_MERGE:
                break

            key = (src.shop.lower(), src.external_id)
            dest = dest_map.get(key)

            if not dest:
                # New product → bulk_create
                to_create.append(
                    Product(
                        shop=src.shop,
                        external_id=src.external_id,
                        similar_id=src.similar_id,
                        identical_id=src.identical_id,
                        name=src.name,
                        variant=src.variant,
                        t_name=src.t_name,
                        t_variant=src.t_variant,
                        t_category=src.t_category,
                        price=src.price,
                        brand=src.brand,
                        category=src.category,
                        url=src.url,
                        image=src.image,
                        in_stock=src.in_stock,
                        embedding=src.embedding,
                        dirty=True,
                    )
                )
                processed_ids.append(src.id)
                continue

            # Existing product → compare allowed fields
            changed_fields = [
                f
                for f in ALLOWED_FIELDS_TO_WRITE
                if getattr(src, f) != getattr(dest, f)
            ]
            if changed_fields:
                # Copy only the allowed changed fields
                for field in changed_fields:
                    setattr(dest, field, getattr(src, field))

                # Manually update the timestamp
                dest.updated_at = timezone.now()

                # Include all changed fields + updated_at for bulk_update
                update_fields_union |= set(changed_fields)
                update_fields_union.add("updated_at")

                # Queue this object for batch update
                to_update.append(dest)

            processed_ids.append(src.id)

            # Batch write per BATCH_SIZE
            if len(to_create) + len(to_update) >= BATCH_SIZE:
                self._flush_batch(to_create, to_update, update_fields_union)
                to_create.clear()
                to_update.clear()
                update_fields_union.clear()

        # Flush remaining items
        self._flush_batch(to_create, to_update, update_fields_union)

        # Reset dirty flag in source DB if needed (currently commented)
        """ Product.objects.using(self.source_db).filter(id__in=processed_ids).update(dirty=False) """

        db_merge_log(
            f"[DIRTY] Merge completed. Created={len(to_create)}, Updated={len(to_update)} "
            f"in {round(time.time() - start_time, 2)}s"
        )

    def _flush_batch(self, to_create, to_update, update_fields_union):
        """Bulk write a batch of products"""
        if to_create:
            Product.objects.using(self.dest_db).bulk_create(
                to_create, batch_size=BATCH_SIZE
            )
        if to_update:
            Product.objects.using(self.dest_db).bulk_update(
                to_update, fields=list(update_fields_union), batch_size=BATCH_SIZE
            )
