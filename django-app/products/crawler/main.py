import time
import random
import traceback
from threading import Thread
from queue import Queue, Empty
from django.utils import timezone
from products.models import Product
from products.crawler.manager import DatabaseManager
from products.crawler.settings import FetchSettings
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from products.crawler.config import (
    ALLOWED_FIELDS_TO_TRACK,
    PROD_DB,
    SHOPS_TO_CRAWL,
    SHOPS,
    UPDATE_DB,
)
from products.crawler.utils import interleave_tasks
from collections import defaultdict


class ShopCrawlerEngine:
    """Shop Crawler with multithreading

    Copyright (c) 2025-2026 Andro Ranogajec
    All rights reserved.
    """

    settings = FetchSettings()

    MAX_THREADS = settings.max_threads
    SPAWN_DELAY = settings.spawn_delay
    BATCH_SIZE = settings.batch_size
    PAUSE_BETWEEN_BATCHES = settings.pause_between_batches

    def run(
        self,
        shop: str | None = None,
        category: str | None = None,
        pages: int = 999,
        track_fields: list[str] | None = None,
    ):
        self.crawled_ids = defaultdict(set)

        try:
            crawl_shops = [shop] if shop else SHOPS_TO_CRAWL
            filter_category = category
            max_pages = pages
            track_fields = track_fields or ALLOWED_FIELDS_TO_TRACK

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
            tasks_by_shop = defaultdict(list)
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

                    tasks_by_shop[shop_name].append(
                        (shop_name, category_name, fetch_fn, url)
                    )

            # Shuffle tasks to spread requests
            tasks = interleave_tasks(tasks_by_shop, shuffle_within_shop=True)
            threads = []

            # Launch threads for shuffled tasks
            for shop_name, category_name, fetch_fn, url in tasks:
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

            # Xstore exception handler for products out of stock, they delete them from the site
            if "xstore" in crawl_shops and not filter_category and max_pages == 999:
                self.handle_xstore_missing_products()

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

            if shop == "xstore":
                external_id = item_data.get("external_id")
                if external_id:
                    self.crawled_ids["xstore"].add(external_id)

            product, created, change_info = DatabaseManager.state_machine(
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

    def batch_consumer(self, batch_queue, track_fields):
        """Consume batches from the queue and process them immediately"""
        batch_number = 1

        while True:
            try:
                item = batch_queue.get(timeout=5)

                if item is None:
                    batch_queue.task_done()
                    break

                batch, shop, category, batch_idx = item
                self.process_batch(batch, shop, category, batch_idx, track_fields)
                batch_queue.task_done()

                batch_number += 1

            except Empty:
                continue

    def shop_worker(
        self, shop_name, category_name, fetch_fn, category_url, max_pages, batch_queue
    ):
        """Worker thread for crawling a specific shop/category"""
        shop_crawler_log(f"[WORKER] START shop={shop_name} category={category_name}")

        try:
            batch = []
            for page_num, item in enumerate(
                fetch_fn(category_url, max_pages=max_pages), start=1
            ):
                batch.append(item)

                if len(batch) >= self.BATCH_SIZE:
                    batch_queue.put((batch, shop_name, category_name, page_num))
                    batch = []

            if batch:
                batch_queue.put((batch, shop_name, category_name, page_num))

            shop_crawler_log(
                f"[WORKER] FINISHED shop={shop_name} category={category_name}"
            )

        except Exception as e:
            shop_crawler_log(
                f"[WORKER] ERROR shop={shop_name} category={category_name}: {e}"
            )

    def handle_xstore_missing_products(self):
        """
        For XSTORE:
        DB active products MINUS crawled products
        => mark as in_stock=False and save to UPDATE_DB
        """

        shop_crawler_log("XSTORE missing detection started")

        crawled_ids = self.crawled_ids.get("xstore", set())

        # Get all ACTIVE products from PROD_DB
        db_products = Product.objects.using(PROD_DB).filter(
            shop="xstore", in_stock=True
        )

        db_ids = set(db_products.values_list("external_id", flat=True))

        missing_ids = db_ids - crawled_ids

        shop_crawler_log(f"XSTORE missing products detected: {len(missing_ids)}")

        for product in db_products.filter(external_id__in=missing_ids):
            product.in_stock = False
            product.dirty = True
            product.updated_at = timezone.now()
            product.save(using=UPDATE_DB)

        shop_crawler_log("XSTORE missing detection finished")
