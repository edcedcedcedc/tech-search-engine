# products/management/commands/run_crawler_pipeline.py
import time
import random
import sys
from django.core.management import call_command
from django.core.management.base import BaseCommand
from server.products.utils.shop_crawler_engine_log import aggregation_log


class Command(BaseCommand):
    help = "Orchestrator for crawler command only (ready to chain other commands later)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--shops",
            nargs="+",
            type=str,
            help="List of shops to run crawler for",
            default=["enter", "darwin", "xstore"],
        )
        parser.add_argument(
            "--max-pages", type=int, default=50, help="Max pages to fetch per category"
        )
        parser.add_argument(
            "--sleep-interval",
            type=int,
            default=24 * 60 * 60,  # 24h default
            help="Sleep interval between full runs (seconds)",
        )

    def handle(self, *args, **options):
        shops = options["shops"]
        max_pages = options["max_pages"]
        sleep_interval = options["sleep_interval"]

        # Define shop -> categories mapping
        SHOP_CATEGORIES = {
            "enter": "laptop mobilephone pc gaming".split(),
            "darwin": "monitor laptop mobilephone pc gpu ssd hdd ram mb cpu keyboard mouse mousepad externhdd powersupply fan fanbase gaming router switch".split(),
            "xstore": "laptop laptopaccessories software headphones accessories pc setuppc consolegaming componentspc apple allinonepc brandpc minipc phones tablete perifericp monitoare scaune televizoare accesoriitv imprimante tehnicadebirou proiectoaresiecrane aspiratoarerobot".split(),
        }

        try:
            while True:
                aggregation_log("=== Crawler pipeline run started ===")

                for shop in shops:
                    categories = SHOP_CATEGORIES.get(shop, [])
                    if not categories:
                        aggregation_log(f"Skipping unknown shop: {shop}")
                        continue

                    for category in categories:
                        aggregation_log(
                            f"Starting crawler: {shop}/{category} (max {max_pages} pages)"
                        )

                        # Call the aggregation_engine command for this shop/category
                        call_command(
                            "aggregation_engine",
                            shop=shop,
                            category=category,
                            pages=max_pages,
                        )

                        # Random sleep to avoid hammering
                        sleep_time = random.uniform(2, 5)
                        aggregation_log(
                            f"Sleeping {sleep_time:.1f}s between categories..."
                        )
                        time.sleep(sleep_time)

                    # Sleep between shops
                    shop_sleep = random.uniform(3, 6)
                    aggregation_log(f"Sleeping {shop_sleep:.1f}s between shops...")
                    time.sleep(shop_sleep)

                aggregation_log(
                    f"=== [CRAWL] Crawler pipeline 1/5 run complete, sleeping {sleep_interval}s before next run ==="
                )
                time.sleep(sleep_interval)

                for shop in shop:
                    call_command("merge", source=shop, dest="stage", shop=shop)
                aggregation_log(
                    f"===[MERGE] Crawler pipeline 2/5 run complete, sleeping {sleep_interval}s before next run ==="
                )

                for shop in shop:
                    call_command(
                        "update_categories_per_shop",
                        shop=shop,
                        db="stage",
                    )
                aggregation_log(
                    f"===[CATEGORY] Crawler pipeline 3/5 run complete, sleeping {sleep_interval}s before next run ==="
                )

                for shop in shop:
                    call_command(
                        "update_categories_per_shop",
                        shop=shop,
                        db="stage",
                    )
                aggregation_log(
                    f"===[CATEGORY] Crawler pipeline 3/5 run complete, sleeping {sleep_interval}s before next run ==="
                )

        except KeyboardInterrupt:
            aggregation_log(
                "Crawler pipeline interrupted by user, stopping gracefully."
            )
            sys.exit(0)
