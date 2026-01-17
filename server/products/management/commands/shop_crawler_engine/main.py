from django.core.management.base import BaseCommand
from products.management.commands.shop_crawler_engine.utils import DatabaseManager
from products.management.commands.shop_crawler_engine.config import config
from products.utils.log.shop_crawler_engine_log import shop_crawler_log, random_sleep
import traceback
from threading import Thread
from queue import Queue


class Command(BaseCommand):
    """Shop Crawler Engine - Crawl Moldovan electronics shops with multithreading"""

    BATCH_SIZE = 500
    PAUSE_BETWEEN_BATCHES = (60, 3600)  # seconds

    def add_arguments(self, parser):
        parser.add_argument(
            "--shop", type=str, default=None, help="Filter by specific shop"
        )
        parser.add_argument(
            "--category", type=str, default=None, help="Filter by specific category"
        )
        parser.add_argument("--pages", type=int, default=1)
        parser.add_argument(
            "--track-fields",
            type=str,
            default="price",  # TODO
        )

    def handle(self, *args, **options):
        try:
            filter_shop = options["shop"]
            filter_category = options["category"]
            max_pages = options["pages"]
            track_fields = options["track_fields"].split(",")

            shop_crawler_log("START shop_crawler_engine orchestrator")

            # Queue to hold batches from all threads
            batch_queue = Queue()

            threads = []

            # Launch threads for all shop/category combinations
            for shop_name, shop_cfg in config.items():

                if filter_shop and shop_name != filter_shop:
                    continue

                fetch_fn = shop_cfg.get("function")
                if not fetch_fn:
                    continue

                for category_name, url in shop_cfg.items():
                    if category_name == "function":
                        continue
                    if filter_category and category_name != filter_category:
                        continue

                    t = Thread(
                        target=self.shop_worker,
                        args=(
                            shop_name,
                            category_name,
                            fetch_fn,
                            url,
                            max_pages,
                            batch_queue,
                        ),
                        daemon=True,
                    )
                    t.start()
                    threads.append(t)

            batch_number = 1

            # Consume batches from the queue while threads are alive
            while any(t.is_alive() for t in threads) or not batch_queue.empty():
                try:
                    batch, shop, category, batch_idx = batch_queue.get(timeout=5)
                    self.process_batch(batch, shop, category, batch_idx, track_fields)
                    batch_number += 1

                except:
                    continue

            shop_crawler_log(
                "Saved all created/updated records for downstream processing"
            )
            shop_crawler_log("END shop_crawler_engine orchestrator")

        except KeyboardInterrupt:
            shop_crawler_log("INTERRUPTED by user")
        except Exception as e:
            shop_crawler_log(f"FATAL error: {e}")
            shop_crawler_log(traceback.format_exc())

    def shop_worker(self, shop, category, fetch_fn, url, max_pages, batch_queue):
        """Worker thread to fetch items from a shop/category and push batches into the queue"""
        try:
            shop_crawler_log(f"START worker for shop={shop}, category={category}")

            batch = []
            batch_number = 1

            for item_data in fetch_fn(url, max_pages):
                batch.append(item_data)

                if len(batch) >= self.BATCH_SIZE:
                    batch_queue.put((batch.copy(), shop, category, batch_number))
                    batch.clear()
                    batch_number += 1
                    random_sleep(*self.PAUSE_BETWEEN_BATCHES)

            # remaining items
            if batch:
                batch_queue.put((batch.copy(), shop, category, batch_number))

            shop_crawler_log(f"END worker for shop={shop}, category={category}")

        except Exception as e:
            shop_crawler_log(
                f"ERROR in worker for shop={shop}, category={category}: {e}"
            )
            shop_crawler_log(traceback.format_exc())

    def process_batch(self, batch, shop, category, batch_number, track_fields):
        saved_count = 0
        updated_count = 0

        shop_crawler_log(
            f"PROCESSING batch {batch_number} | "
            f"shop={shop} category={category} size={len(batch)}"
        )

        for item_data in batch:
            product, created, change_info = DatabaseManager.save_or_update_product(
                item_data, track_fields
            )
            if product:
                if created:
                    saved_count += 1
                elif change_info.get("has_changes"):
                    updated_count += 1

        shop_crawler_log(
            f"BATCH {batch_number} RESULT | "
            f"created={saved_count} updated={updated_count}"
        )
