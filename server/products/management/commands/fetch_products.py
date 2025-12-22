import html
import re
import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from products.models import Product
import itertools
import sys
import threading
import time


# How to use it for now
# python manage.py fetch_products --shop darwin --category pc --pages 2


def fetch_enter_products(category_url, valid_categories=None, max_pages=1):
    all_items = []

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        links = soup.select("div.product-item[data-gtm]")

        if not links:
            raise Exception("No links in darwin products")

        for link in links:
            raw = link.get("data-gtm")
            title_tag = link.select_one(".product-title")
            title = title_tag.get_text(strip=True) if title_tag else None
            variant_tag = link.select_one(".product-desc")
            variant = variant_tag.get_text(strip=True) if variant_tag else None
            if not raw:
                continue

            decoded = html.unescape(raw)

            item_data = {
                "external_id": (
                    re.search(r'"item_id":"(.*?)"', decoded) or [None, None]
                )[1],
                "name": f"{title}",
                "price": int((re.search(r'"price":(\d+)', decoded) or [0, 0])[1]),
                "brand": (re.search(r'"item_brand":"(.*?)"', decoded) or [None, None])[
                    1
                ],
                "category": (
                    re.search(r'"item_category":"(.*?)"', decoded) or [None, None]
                )[1],
                "variant": f"{variant}",
                "url": link.select_one(".stretched-link")["href"],
                "shop": "Enter",
            }
            # TODO: availability / stock status
            # Example:
            # availability_text = card.get("data-text", "").lower()
            # item_data["in_stock"] = "epuizat" not in availability_text

            all_items.append(item_data)

    return all_items


def fetch_darwin_products(category_url, valid_categories=None, max_pages=10):
    all_items = []

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        links = soup.select("a[data-ga4]")

        if not links:
            break

        for link in links:
            raw = link.get("data-ga4")
            decoded = html.unescape(raw)

            item_data = {
                "external_id": (
                    re.search(r'"item_id":"(.*?)"', decoded) or [None, None]
                )[1],
                "name": (re.search(r'"item_name":"(.*?)"', decoded) or [None, None])[1],
                "price": int((re.search(r'"price":(\d+)', decoded) or [0, 0])[1]),
                "brand": (re.search(r'"item_brand":"(.*?)"', decoded) or [None, None])[
                    1
                ],
                "category": (
                    re.search(r'"item_category":"(.*?)"', decoded) or [None, None]
                )[1],
                "variant": (re.search(r'"item_variant":"(.*?)"', decoded) or ["", ""])[
                    1
                ]
                .replace("\\", "")
                .strip(),
                "url": link.get("href"),
                "shop": "Darwin",
            }

            # Filter by valid categories if provided
            # if valid_categories and item_data["category"] not in valid_categories:
            #    continue

            # Try to get image
            # img_tag = link.find_previous("div", class_="product-img").find("img")
            # item_data["image"] = img_tag.get("data-src") if img_tag else None

            all_items.append(item_data)

    return all_items


CATEGORIES = {
    "enter": {
        "function": fetch_enter_products,
        "monitor": "https://enter.online/for-gamers/monitoare-gaming",
        "laptop": "https://enter.online/laptopuri",
        # "telefoane": "https://darwin.md/telefoane",
        "pc": "https://enter.online/calculatoare",  # all junk hdds, monitors, gpus...etc
    },
    "darwin": {
        "function": fetch_darwin_products,
        "monitor": "https://darwin.md/monitoare",
        "laptop": "https://darwin.md/laptopuri",
        # "telefoane": "https://darwin.md/telefoane",
        "pc": "https://darwin.md/calculatoare",
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
            "--shop", type=str, help="Please select a shop to fetch", default=None
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

    def handle(self, *args, **options):
        category = options["category"]
        shop = options["shop"]
        pages = options["pages"]
        url = CATEGORIES.get(shop).get(category)

        if not url:
            self.stdout.write(
                self.style.ERROR(f"Unknown category: {category} or {shop} or {pages}")
            )
            return

        spinner = self.Spinner(f"Fetching products from {url}")
        spinner.start()
        items = CATEGORIES.get(shop).get("function")(url, pages)
        spinner.stop()
        self.stdout.write(self.style.SUCCESS(f"Found {len(items)} products"))

        for item_data in items:
            Product.objects.update_or_create(
                # External id makes sure no duplicates are stored in the db
                external_id=item_data["external_id"],
                defaults=item_data,
            )
            self.stdout.write(f"Saved: {item_data['name']}")

        self.stdout.write(
            self.style.SUCCESS(f"Done fetching {category} products from {shop}!")
        )
