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

# How to use it for now
# python manage.py fetch_products --shop darwin --category pc --pages 2


def fetch_enter_products(category_url, max_pages=1):
    all_items = []

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        nodes = soup.select("div.product-item[data-gtm]")

        if not nodes:
            raise Exception("No nodes in darwin products")

        for node in nodes:
            raw = node.get("data-gtm")
            title_tag = node.select_one(".product-title")
            title = title_tag.get_text(strip=True) if title_tag else None
            variant_tag = node.select_one(".product-desc")
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
                "url": node.select_one(".stretched-link")["href"],
                "shop": "Enter",
            }
            # TODO: availability / stock status
            # Example:
            # availability_text = card.get("data-text", "").lower()
            # item_data["in_stock"] = "epuizat" not in availability_text

            all_items.append(item_data)

    return all_items


def fetch_darwin_products(category_url, max_pages=1):
    all_items = []

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        nodes = soup.select("a[data-ga4]")

        if not nodes:
            break

        for node in nodes:
            raw = node.get("data-ga4")
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
                "url": node.get("href"),
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
            help="Disable spinner and use binary stdout (for cron/logs)",
        )

    def handle(self, *args, **options):

        if sys.platform == "win32":
            sys.stdout.reconfigure(encoding="utf-8")
        else:
            sys.stdout = io.TextIOWrapper(
                sys.stdout.buffer, encoding="utf-8", line_buffering=True
            )

        category = options["category"]
        shop = options["shop"]
        pages = options["pages"]
        auto_stdout = options["auto_stdout"]
        url = CATEGORIES.get(shop).get(category)

        if not url:
            self.stdout.write(
                self.style.ERROR(f"Unknown category: {category} or {shop} or {pages}")
            )
            return

        if auto_stdout:
            try:
                print(f"Fetching products from {url}", flush=True)
                print("", flush=True)
            except UnicodeEncodeError:
                sys.stdout.buffer.write(f"Fetching products from {url}\n\n")
                sys.stdout.buffer.flush()

            items = CATEGORIES.get(shop).get("function")(url, pages)

            try:
                print(f"Found {len(items)} products", flush=True)
                print("", flush=True)
            except UnicodeEncodeError:
                sys.stdout.buffer.write(f"Found {len(items)} products\n\n")
                sys.stdout.buffer.flush()
        else:
            spinner = self.Spinner(f"Fetching products from {url}")
            spinner.start()
            items = CATEGORIES.get(shop).get("function")(url, pages)
            spinner.stop()
            self.stdout.write(self.style.SUCCESS(f"Found {len(items)} products"))

        saved_count = 0
        updated_count = 0

        for item_data in items:
            try:
                obj, created = Product.objects.get_or_create(
                    shop=item_data["shop"],
                    external_id=item_data["external_id"],
                    defaults=item_data,
                )

                if not created:
                    # update mutable fields
                    obj.name = item_data["name"]
                    obj.price = item_data["price"]
                    obj.url = item_data["url"]
                    obj.variant = item_data["variant"]
                    obj.image = item_data.get("image", obj.image)
                    obj.in_stock = True
                    obj.updated_at = timezone.now()
                    updated_count += 1
                else:
                    saved_count += 1

                obj.save()

                if auto_stdout:

                    action = "CREATED" if created else "UPDATED"
                    try:
                        print(f"{action}: {item_data['name']}", flush=True)
                    except UnicodeEncodeError:

                        output = f"{action}: {item_data['name']}\n"
                        sys.stdout.buffer.write(output)
                        sys.stdout.buffer.flush()
                else:
                    action = "✓" if created else "↻"
                    try:
                        self.stdout.write(f"{action} {item_data['name'][:50]}...")
                    except UnicodeEncodeError:

                        safe_name = (
                            item_data["name"][:50]
                            .encode("ascii", "ignore")
                            .decode("ascii")
                        )
                        self.stdout.write(f"{action} {safe_name}...")

            except Exception as e:
                error_msg = f"ERROR: Failed to save {item_data.get('name', 'Unknown')}: {str(e)}"
                if auto_stdout:
                    try:
                        print(error_msg, flush=True)
                    except UnicodeEncodeError:
                        sys.stdout.buffer.write(f"{error_msg}\n")
                        sys.stdout.buffer.flush()
                else:
                    self.stdout.write(self.style.ERROR(error_msg))

        if auto_stdout:
            try:
                print("", flush=True)
                print(
                    f"SUMMARY: {saved_count} created, {updated_count} updated",
                    flush=True,
                )
                print(f"COMPLETED: {category} products from {shop}", flush=True)
                print("=" * 60, flush=True)
            except UnicodeEncodeError:
                summary = f"\nSUMMARY: {saved_count} created, {updated_count} updated\n"
                summary += f"COMPLETED: {category} products from {shop}\n"
                summary += "=" * 60 + "\n"
                sys.stdout.buffer.write(summary)
                sys.stdout.buffer.flush()
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDone! {saved_count} created, {updated_count} updated"
                )
            )
