"""
MERGE PERFORMANCE NOTES (READ BEFORE MODIFYING):

This merge is optimized for speed and scalability.

Key optimizations:
1. Bulk operations over per-row writes
   - Uses bulk_create / bulk_update instead of update_or_create or save()
   - Reduces DB queries from ~100k+ to <100 for large datasets

2. No OFFSET-based pagination
   - Uses queryset.iterator(chunk_size=...)
   - Prevents O(n²) behavior on large tables

3. One transaction per batch (not per row)
   - Minimizes DB locking, fsync, and WAL overhead

4. In-memory destination index
   - Preloads destination products into a dict {(shop, external_id): product}
   - Eliminates DB lookups during merge (O(1) access)

5. Minimal writes in dirty mode
   - Updates only changed fields (e.g. price)
   - Avoids unnecessary overwrites

6. Logging kept out of hot paths
   - No per-row logging
   - Logs only per batch / summary

Design principle:
    "Databases love sets, hate loops"

Do NOT revert to update_or_create, OFFSET slicing, or per-row transactions
unless correctness absolutely requires it.
"""

import time
import signal
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product
from products.utils.log.db_merge_log import db_merge_log

BATCH_SIZE = 2000
STOP_MERGE = False

# Crawler decides what to update, merge decides what to write
ALLOWED_FIELDS_TO_WRITE = ["price"]


def signal_handler(sig, frame):
    global STOP_MERGE
    print("\nReceived Ctrl+C, stopping merge gracefully...")
    db_merge_log("INTERRUPTED by user (Ctrl+C)")
    STOP_MERGE = True


signal.signal(signal.SIGINT, signal_handler)


class Command(BaseCommand):
    help = "High-performance merge between product databases (force or dirty)"

    def add_arguments(self, parser):
        parser.add_argument("--source", type=str, required=True)
        parser.add_argument("--dest", type=str, default="default")
        parser.add_argument("--shop", type=str)
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **options):
        source_db = options["source"]
        dest_db = options["dest"]
        force = options["force"]
        shop = options.get("shop")
        shop = shop.lower() if shop else None

        if force:
            db_merge_log(f"[FORCE] {source_db} → {dest_db}")
            self.force_merge(source_db, dest_db)
        else:
            if not shop:
                raise db_merge_log("Shop must be provided for dirty merges.")
            db_merge_log(f"[DIRTY] {source_db} → {dest_db} | shop={shop}")
            self.dirty_merge(source_db, dest_db, shop)

    # ------------------------------------------------------------------
    # FORCE MERGE (Stage <-> Prod)
    # ------------------------------------------------------------------
    def force_merge(self, source_db, dest_db):
        global STOP_MERGE

        start = time.time()

        with transaction.atomic(using=dest_db):
            db_merge_log("[FORCE] Clearing destination DB")
            Product.objects.using(dest_db).all().delete()

            batch = []
            total = 0

            for p in (
                Product.objects.using(source_db).all().iterator(chunk_size=BATCH_SIZE)
            ):
                if STOP_MERGE:
                    break

                batch.append(
                    Product(
                        shop=p.shop,
                        external_id=p.external_id,
                        canonical_id=p.canonical_id,
                        name=p.name,
                        variant=p.variant,
                        t_name=p.t_name,
                        t_variant=p.t_variant,
                        t_category=p.t_category,
                        price=p.price,
                        brand=p.brand,
                        category=p.category,
                        url=p.url,
                        image=p.image,
                        in_stock=p.in_stock,
                        embedding=p.embedding,
                        dirty=p.dirty,
                    )
                )

                if len(batch) >= BATCH_SIZE:
                    Product.objects.using(dest_db).bulk_create(batch)
                    total += len(batch)
                    batch.clear()

            if batch:
                Product.objects.using(dest_db).bulk_create(batch)
                total += len(batch)

        db_merge_log(
            f"[FORCE] Completed: {total} products in {round(time.time() - start, 2)}s"
        )

    def dirty_merge(self, source_db, dest_db, shop):
        global STOP_MERGE

        start = time.time()

        src_qs = Product.objects.using(source_db).filter(
            shop__iexact=shop,
            dirty=True,
            change_type__in=["created", "updated"],
        )

        # Preload destination products ONCE
        dest_map = {
            (p.shop.lower(), p.external_id): p
            for p in Product.objects.using(dest_db).filter(shop__iexact=shop)
        }

        to_create = []
        to_update = []
        update_fields_union = set()

        for p in src_qs.iterator(chunk_size=BATCH_SIZE):
            if STOP_MERGE:
                break

            key = (p.shop.lower(), p.external_id)

            # --------------------------------------------------
            # CREATED → bulk_create
            # --------------------------------------------------
            if p.change_type == "created":
                if key not in dest_map:
                    to_create.append(
                        Product(
                            shop=p.shop.lower(),
                            external_id=p.external_id,
                            canonical_id=p.canonical_id,
                            name=p.name,
                            variant=p.variant,
                            t_name=p.t_name,
                            t_variant=p.t_variant,
                            t_category=p.t_category,
                            price=p.price,
                            brand=p.brand,
                            category=p.category,
                            url=p.url,
                            image=p.image,
                            in_stock=p.in_stock,
                            embedding=p.embedding,
                            dirty=False,
                        )
                    )
                continue

            # --------------------------------------------------
            # UPDATED → bulk_update (field-level)
            # --------------------------------------------------
            if p.change_type == "updated" and key in dest_map:
                dest = dest_map[key]

                changed_fields = set(p.changed_fields or [])
                allowed_fields = changed_fields & set(ALLOWED_FIELDS_TO_WRITE)

                if not allowed_fields:
                    continue

                for field in allowed_fields:
                    setattr(dest, field, getattr(p, field))

                update_fields_union |= allowed_fields
                to_update.append(dest)

        # --------------------------------------------------
        # WRITE PHASE
        # --------------------------------------------------
        with transaction.atomic(using=dest_db):
            if to_create:
                Product.objects.using(dest_db).bulk_create(
                    to_create, batch_size=BATCH_SIZE
                )

            if to_update:
                Product.objects.using(dest_db).bulk_update(
                    to_update,
                    fields=list(update_fields_union),
                    batch_size=BATCH_SIZE,
                )

        db_merge_log(
            f"[DIRTY] created={len(to_create)} updated={len(to_update)} "
            f"in {round(time.time() - start, 2)}s"
        )
