import time
import signal
from django.core.management.base import BaseCommand
from django.db import transaction, OperationalError
from products.models import Product
from products.utils.db_merge_log import db_merge_log

MAX_DB_RETRIES = 5
DB_RETRY_SLEEP = 5
BATCH_SIZE = 500
STOP_MERGE = False


def signal_handler(sig, frame):
    global STOP_MERGE
    print("\nReceived Ctrl+C, stopping merge gracefully...")
    db_merge_log("INTERRUPTED by user (Ctrl+C)")
    STOP_MERGE = True


signal.signal(signal.SIGINT, signal_handler)


class Command(BaseCommand):
    help = "Merge products from a shop DB into production DB (default) in batches"

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=str,
            help="Source DB to merge from (xstore, darwin, enter)",
            required=True,
        )
        parser.add_argument(
            "--shop",
            type=str,
            help="Shop name (Darwin, Enter, XStore)",
            required=True,
        )

    def handle(self, *args, **options):
        global STOP_MERGE

        source_db = options["source"]
        shop_name = options["shop"]

        db_merge_log(f"START merge from DB='{source_db}' for shop='{shop_name}'")

        offset = 0
        merged_count = 0

        while True:
            if STOP_MERGE:
                db_merge_log("Merge stopped by user")
                break

            batch = (
                Product.objects.using(source_db)
                .filter(shop=shop_name)
                .order_by("id")[offset : offset + BATCH_SIZE]
            )

            if not batch.exists():
                break

            for item in batch:
                if STOP_MERGE:
                    break

                for attempt in range(1, MAX_DB_RETRIES + 1):
                    try:
                        with transaction.atomic(using="default"):
                            Product.objects.using("default").update_or_create(
                                shop=item.shop,
                                external_id=item.external_id,
                                defaults={
                                    "name": item.name,
                                    "variant": item.variant,
                                    "t_name": item.t_name,
                                    "t_variant": item.t_variant,
                                    "price": item.price,
                                    "brand": item.brand,
                                    "category": item.category,
                                    "url": item.url,
                                    "in_stock": item.in_stock,
                                },
                            )
                        merged_count += 1
                        db_merge_log(f"[MERGED] {item.external_id} | {item.name}")
                        break
                    except OperationalError as e:
                        if "database is locked" in str(e).lower():
                            msg = f"DB locked for {item.external_id}, retry {attempt}/{MAX_DB_RETRIES}"
                            db_merge_log(msg)
                            time.sleep(DB_RETRY_SLEEP)
                        else:
                            msg = f"DB error for {item.external_id}: {e}"
                            db_merge_log(msg)
                            break

            offset += BATCH_SIZE
            msg = f"➡ Merged {merged_count} products so far..."
            db_merge_log(msg)

        msg = f"✔ Merge finished. Total merged: {merged_count}"
        db_merge_log(msg)
