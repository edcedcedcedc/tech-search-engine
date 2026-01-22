import random
import time
from django.core.management.base import BaseCommand
from products.management.commands.shop_crawler_engine.utils import (
    DatabaseManager,
)
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from products.management.commands.shop_crawler_engine.utils import random_sleep
import traceback
from threading import Thread
from queue import Queue
from settings import CrawlSettings
from products.management.commands.shop_crawler_engine.config import (
    ALLOWED_FIELDS_TO_WRITE_AND_TRACK,
    SHOPS_TO_CRAWL,
    SHOPS,
)


class Command(BaseCommand):
    """Shop Crawler Engine with multithreading

    Copyright (c) 2025-2026 Andro Ranogajec
    All rights reserved.

    This software and associated documentation files (the "Software") are
    proprietary. You may not copy, modify, distribute, or use this Software
    without prior written permission from the author.




    | Symptom    | Action                      |
    | ---------- | --------------------------- |
    | Too slow   | Increase `MAX_THREADS` to 6 |
    | 429s       | Increase `SPAWN_DELAY`      |
    | CPU spike  | Reduce `MAX_THREADS`        |
    | Network OK | Reduce delay, not threads   |
    """

    settings = CrawlSettings()

    MAX_THREADS = settings.max_threads
    SPAWN_DELAY = settings.spawn_delay
    BATCH_SIZE = settings.batch_size
    PAUSE_BETWEEN_BATCHES = settings.pause_between_batches

    def add_arguments(self, parser):
        parser.add_argument(
            "--shop", type=str, default=None, help="Filter by specific shop"
        )
        parser.add_argument(
            "--category", type=str, default=None, help="Filter by specific category"
        )
        parser.add_argument("--pages", type=int, default=999)
        parser.add_argument("--track-fields", type=str, default=None)

    def handle(self, *args, **options):
        try:
            shop_option = options.get("shop")
            crawl_shops = [shop_option] if shop_option else SHOPS_TO_CRAWL
            filter_category = options["category"]
            max_pages = options["pages"]
            track_fields = (
                options["track_fields"].split(",")
                if options["track_fields"]
                else ALLOWED_FIELDS_TO_WRITE_AND_TRACK
            )

            shop_crawler_log("START shop_crawler_engine orchestrator")

            # Queue to hold batches from all threads
            batch_queue = Queue()

            # Start the batch consumer thread
            consumer_thread = Thread(
                target=self.batch_consumer,
                args=(batch_queue, track_fields),
                daemon=True,
            )
            consumer_thread.start()

            # Flatten all tasks from all shops/categories
            tasks = []
            for shop_name, shop_cfg in SHOPS.items():
                if shop_name not in crawl_shops:
                    continue
                fetch_fn = shop_cfg.get("function")
                if not fetch_fn:
                    continue

                for category_name, url in shop_cfg.items():
                    if category_name == "function":
                        continue
                    if filter_category and category_name != filter_category:
                        continue
                    tasks.append((shop_name, category_name, fetch_fn, url))

            # Shuffle tasks to spread requests
            random.shuffle(tasks)

            threads = []

            # Launch threads for shuffled tasks
            for shop_name, category_name, fetch_fn, url in tasks:
                # Wait if max threads reached
                while sum(t.is_alive() for t in threads) >= self.MAX_THREADS:
                    shop_crawler_log(
                        f"SPAWN Max threads reached ({self.MAX_THREADS}), waiting..."
                    )
                    time.sleep(2)

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

                # stagger thread startup
                sleep_time = random.uniform(*self.SPAWN_DELAY)
                shop_crawler_log(
                    f"SPAWN Started worker shop={shop_name} category={category_name}, "
                    f"sleeping {sleep_time:.1f}s before next spawn"
                )
                time.sleep(sleep_time)

            # Wait for all worker threads to finish
            for t in threads:
                t.join()

            # Push sentinel to stop consumer thread
            batch_queue.put(None)

            # Wait for consumer to finish
            consumer_thread.join()

            shop_crawler_log(
                "Saved all created/updated records for downstream processing"
            )
            shop_crawler_log("END shop_crawler_engine orchestrator")

        except KeyboardInterrupt:
            shop_crawler_log("INTERRUPTED by user")
        except Exception as e:
            shop_crawler_log(f"FATAL error: {e}")
            shop_crawler_log(traceback.format_exc())

    def process_batch(self, batch, shop, category, batch_number, track_fields):
        saved_count = 0
        updated_count = 0
        archived_count = 0
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
            # archived={archived_count}
        shop_crawler_log(
            f"BATCH {batch_number} RESULT | "
            f"created={saved_count} updated={updated_count} "
        )

    def batch_consumer(self, batch_queue, track_fields):
        """Consume batches from the queue and process them immediately"""
        batch_number = 1

        while True:
            try:
                batch, shop, category, batch_idx = batch_queue.get(timeout=5)
                if batch is None:  # sentinel to stop consumer
                    break
                self.process_batch(batch, shop, category, batch_idx, track_fields)
                batch_queue.task_done()
                batch_number += 1
            except batch_queue.Empty:
                continue
