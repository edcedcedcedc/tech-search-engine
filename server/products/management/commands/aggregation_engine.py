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
from django.utils import timezone
import traceback


""" 
Usage:
python manage.py aggregation_engine --shop darwin --category pc --pages 1
 """


def normalize(name: str) -> str:
    if not name:
        return ""

    # Remove literal backslashes \
    name = name.replace("\\", "")

    # Replace double slashes // with single /
    name = name.replace("//", "/")

    # Remove single quotes ' and backticks `
    name = name.replace("'", "").replace("`", "")

    # Normalize quotes: curly quotes → straight quotes
    name = name.replace("“", '"').replace("”", '"')

    # Remove spaces before/after slashes
    name = re.sub(r"\s*/\s*", "/", name)

    # Remove extra space in decimal numbers (e.g., 23. 8 → 23.8)
    name = re.sub(r"(\d)\.\s+(\d)", r"\1.\2", name)

    # Normalize multiple spaces into a single space
    name = re.sub(r"\s+", " ", name)

    # Strip leading/trailing spaces
    name = name.strip()

    return name


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
                    in_stock = False

            if not raw:
                continue

            decoded = html.unescape(raw)
            item_data = {
                "external_id": (
                    re.search(r'"item_id":"(.*?)"', decoded) or [None, None]
                )[1],
                "name": normalize(title),
                "variant": normalize(variant),
                "t_name": {"ro": normalize(title), "en": None, "ru": None},
                "t_variant": {"ro": normalize(variant), "en": None, "ru": None},
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
            in_stock = "out-of-stock" not in node.get("class", [])

            if not raw:
                continue

            decoded = html.unescape(raw)

            name = normalize(
                (re.search(r'"item_name":"(.*?)"', decoded) or [None, ""])[1]
            )
            variant = normalize(
                (re.search(r'"item_variant":"(.*?)"', decoded) or ["", ""])[1]
            )

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

    return all_items


CATEGORIES = {
    "enter": {
        "function": fetch_enter_products,
        "monitor": "https://enter.online/for-gamers/monitoare-gaming",
        "laptop": "https://enter.online/laptopuri",
        "mobile_phone": "https://darwin.md/telefoane",
        "pc": "https://enter.online/calculatoare",  # all junk hdds, monitors, gpus...etc
        "gpu": "https://darwin.md/componente-pc/placi-video",
        "ssd": "https://darwin.md/componente-pc/dispozitive-de-stocare/ssd",
        "hdd": "https://darwin.md/componente-pc/dispozitive-de-stocare/hdd",
        "ram": "https://darwin.md/componente-pc/ram",
        "mb": "https://darwin.md/componente-pc/motherboard",
        "cpu": "https://darwin.md/componente-pc/cpu",
    },
    "darwin": {
        "function": fetch_darwin_products,
        "monitor": "https://darwin.md/monitoare",
        "laptop": "https://darwin.md/laptopuri",
        "mobile_phone": "https://darwin.md/telefoane",
        "pc": "https://darwin.md/calculatoare",
        "gpu": "",
        "ssd": "",
        "hdd": "",
        "ram": "",
        "mb": "",
        "cpu": "",
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
            stream = io.TextIOWrapper(
                sys.stdout.buffer, encoding="utf-8", errors="replace"
            )

            def write(msg):
                try:
                    stream.write(str(msg) + "\n")
                    stream.flush()
                except Exception:
                    safe = str(msg).encode("ascii", "ignore").decode("ascii")
                    stream.write(safe + "\n")
                    stream.flush()

            if not url or not fetch_fn:
                msg = f"Unknown category/shop/pages: {category} / {shop} / {pages}"
                if auto_stdout:
                    write(msg)
                else:
                    write(self.style.ERROR(msg))
                return

            if auto_stdout:
                write(f"Fetching products from {url}")
                items = fetch_fn(url, pages)
                write(f"Found {len(items)} products")
            else:
                spinner = self.Spinner(f"Fetching products from {url}")
                spinner.start()
                items = fetch_fn(url, pages)
                spinner.stop()
                write(self.style.SUCCESS(f"Found {len(items)} products"))

            saved_count = 0
            updated_count = 0

            for item_data in items:
                try:
                    _, created = Product.objects.update_or_create(
                        shop=item_data["shop"],
                        external_id=item_data["external_id"],
                        defaults=item_data,
                    )

                    if not created:
                        updated_count += 1
                    else:
                        saved_count += 1

                    action = "CREATED" if created else "UPDATED"
                    write(f"{action}: {item_data['name']}")

                except Exception as e:
                    msg = f"ERROR saving {item_data.get('name', 'Unknown')}: {e}"
                    if auto_stdout:
                        write(msg)
                    else:
                        write(self.style.ERROR(msg))

            if auto_stdout:
                write(f"SUMMARY: {saved_count} created, {updated_count} updated")
                write(f"COMPLETED: {category} products from {shop}")
                write("=" * 60)
            else:
                write(
                    self.style.SUCCESS(
                        f"\nDone! {saved_count} created, {updated_count} updated"
                    )
                )
        except KeyboardInterrupt:
            write("Process interrupted by user, exiting gracefully...")
            return
        except Exception as e:
            write(f"Unexpected error: {e}", is_error=True)
            write(traceback.format_exc())
