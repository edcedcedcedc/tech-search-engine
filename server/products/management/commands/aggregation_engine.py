import html
import io
import re
import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from products.models import Product
import itertools
import sys
import threading
import time
import traceback
from products.utils.utils import normalize_db
from products.utils.aggregation_engine_log import random_sleep, aggregation_log

""" 
Usage:
python manage.py aggregation_engine --shop darwin --category pc --pages 1
 """

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


def fetch_enter_products(category_url, max_pages=1):
    all_items = []

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"

        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
        except requests.exceptions.RequestException:
            break

        soup = BeautifulSoup(resp.text, "lxml")
        nodes = soup.select("div.product-item[data-gtm]")

        if not nodes:
            break

        for node in nodes:
            raw = node.get("data-gtm")
            title_tag = node.select_one(".product-title")
            title = title_tag.get_text(strip=True) if title_tag else ""
            variant_tag = node.select_one(".product-desc")
            variant = variant_tag.get_text(strip=True) if variant_tag else ""

            # handle in stock / out of stock
            in_stock = True
            add_btn = node.select_one("button[data-action]")
            if add_btn:
                action = add_btn.get("data-action", "")
                if action == "openOutStockModal":
                    # in_stock = False
                    return all_items

            if not raw:
                continue

            decoded = html.unescape(raw)
            item_data = {
                "external_id": (
                    re.search(r'"item_id":"(.*?)"', decoded) or [None, None]
                )[1],
                "name": title,
                "variant": variant,
                "t_name": {"ro": title, "en": None, "ru": None},
                "t_variant": {"ro": variant, "en": None, "ru": None},
                "price": int((re.search(r'"price":(\d+)', decoded) or [0, 0])[1]),
                "brand": (re.search(r'"item_brand":"(.*?)"', decoded) or [None, None])[
                    1
                ],
                "category": (
                    re.search(r'"item_category":"(.*?)"', decoded) or [None, None]
                )[1],
                "url": node.select_one(".stretched-link")["href"] or None,
                "in_stock": in_stock,
                "shop": "Enter",
            }
            all_items.append(item_data)
        random_sleep(2, 10)
    return all_items


def fetch_darwin_products(category_url, max_pages=1):
    all_items = []

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
        except requests.exceptions.RequestException:
            break
        soup = BeautifulSoup(resp.text, "lxml")
        nodes = soup.select("div.product-card.product-item")

        if not nodes:
            break

        for node in nodes:
            link = node.select_one("a[data-ga4]")

            if not link:
                continue

            raw = link.get("data-ga4")

            # return if out of stock, because the items are sorted by popularity by default
            in_stock = "out-of-stock" not in node.get("class", [])
            if not in_stock:
                return all_items

            if not raw:
                continue

            decoded = html.unescape(raw)

            name = (re.search(r'"item_name":"(.*?)"', decoded) or [None, ""])[1]
            variant = (re.search(r'"item_variant":"(.*?)"', decoded) or ["", ""])[1]

            item_data = {
                "external_id": (
                    re.search(r'"item_id":"(.*?)"', decoded) or [None, None]
                )[1],
                "name": name,
                "variant": variant,
                "t_name": {"ro": name, "en": None, "ru": None},
                "t_variant": {"ro": variant, "en": None, "ru": None},
                "price": int((re.search(r'"price":(\d+)', decoded) or [0, 0])[1]),
                "brand": (re.search(r'"item_brand":"(.*?)"', decoded) or [None, None])[
                    1
                ],
                "category": (
                    re.search(r'"item_category":"(.*?)"', decoded) or [None, None]
                )[1],
                "url": link.get("href") or None,
                "in_stock": in_stock,
                "shop": "Darwin",
            }

            all_items.append(item_data)
        random_sleep(2, 10)
    return all_items


CATEGORIES = {
    "enter": {
        "function": fetch_enter_products,
        "laptop": "https://enter.online/laptopuri",
        "mobilephone": "https://enter.online/telefoane",
        "pc": "https://enter.online/calculatoare",
        "gaming": "https://enter.online/for-gamers",
    },
    "darwin": {
        "function": fetch_darwin_products,
        "monitor": "https://darwin.md/monitoare",
        "laptop": "https://darwin.md/laptopuri",
        "mobilephone": "https://darwin.md/telefoane",
        "pc": "https://darwin.md/calculatoare",
        "gpu": "https://darwin.md/componente-pc/placi-video",
        "ssd": "https://darwin.md/componente-pc/dispozitive-de-stocare/ssd",
        "hdd": "https://darwin.md/componente-pc/dispozitive-de-stocare/hdd",
        "ram": "https://darwin.md/componente-pc/ram",
        "mb": "https://darwin.md/componente-pc/motherboard",
        "cpu": "https://darwin.md/componente-pc/cpu",
        "keyboard": "https://darwin.md/periferice-pc/tastaturi",
        "mouse": "https://darwin.md/periferice-pc/mouse-uri",
        "mousepad": "https://darwin.md/periferice-pc/mouse-pad-uri",
        "externhdd": "https://darwin.md/dispozitive-de-stocare-externe/hdd",
        "powersupply": "https://darwin.md/componente-pc/power-supply",
        "fan": "https://darwin.md/componente-pc/coolere",
        "fanbase": "https://darwin.md/accesorii/accesorii-coolere",
        "gaming": "https://darwin.md/gaming",
        "router": "https://darwin.md/retelistica/routere",
        "switch": "https://darwin.md/retelistica/switch",
    },
}


class Command(BaseCommand):

    class Spinner:
        def __init__(self, message="Loading"):
            self.message = message
            self.spinner = itertools.cycle("|/-\\")
            self.running = False
            self.thread = None

        def start(self):
            self.running = True
            self.thread = threading.Thread(target=self._spin)
            self.thread.start()

        def _spin(self):
            while self.running:
                sys.stdout.write(f"\r{self.message} {next(self.spinner)}")
                sys.stdout.flush()
                time.sleep(0.1)

        def stop(self):
            self.running = False
            self.thread.join()
            sys.stdout.write("\r" + " " * (len(self.message) + 2) + "\r")
            sys.stdout.flush()

    def add_arguments(self, parser):
        parser.add_argument(
            "--shop", type=str, help="Select a shop to fetch", default=None
        )
        parser.add_argument(
            "--category",
            type=str,
            help="Category to fetch (monitoare, laptopuri, etc.)",
            default=None,
        )
        parser.add_argument(
            "--pages", type=int, help="Number of pages to fetch", default=1
        )
        parser.add_argument(
            "--auto_stdout",
            action="store_true",
            help="Disable spinner(for cron/logs)",
        )

    def handle(self, *args, **options):
        try:
            category = options["category"]
            shop = options["shop"]
            pages = options["pages"]
            auto_stdout = options["auto_stdout"]

            shop_cfg = CATEGORIES.get(shop)
            url = shop_cfg.get(category) if shop_cfg else None
            fetch_fn = shop_cfg.get("function") if shop_cfg else None

            if not url or not fetch_fn:
                aggregation_log(
                    f"ERROR Unknown category/shop/pages: {category} / {shop} / {pages}"
                )
                return

            aggregation_log(
                f"START Fetching products | shop={shop} category={category}"
            )

            if auto_stdout:
                items = fetch_fn(url, pages)
            else:
                spinner = self.Spinner(f"Fetching products from {url}")
                spinner.start()
                items = fetch_fn(url, pages)
                spinner.stop()

            aggregation_log(f"FOUND {len(items)} products")

            saved_count = 0
            updated_count = 0

            for item_data in items:
                item_data["name"] = item_data["name"]
                item_data["variant"] = item_data["variant"]

                try:
                    _, created = Product.objects.update_or_create(
                        shop=item_data["shop"],
                        external_id=item_data["external_id"],
                        defaults=item_data,
                    )

                    if created:
                        saved_count += 1
                        aggregation_log(f"CREATED {item_data['name']}")
                    else:
                        updated_count += 1
                        aggregation_log(f"UPDATED {item_data['name']}")

                except Exception as e:
                    aggregation_log(
                        f"ERROR saving {item_data.get('name', 'Unknown')}: {e}",
                        level="error",
                    )

            aggregation_log(
                f"SUMMARY shop={shop} category={category} "
                f"created={saved_count} updated={updated_count}"
            )
            aggregation_log("END aggregation_engine run")
            aggregation_log("=" * 60)

        except KeyboardInterrupt:
            aggregation_log("INTERRUPTED by user")
        except Exception as e:
            aggregation_log(f"FATAL error: {e}", level="error")
            aggregation_log(traceback.format_exc(), level="error")
