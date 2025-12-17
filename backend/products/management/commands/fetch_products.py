import html
import re
import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from products.models import Product 

DARWIN_CATEGORIES = {
    "monitoare": "https://darwin.md/monitoare",
    "laptopuri": "https://darwin.md/laptopuri",
    #"telefoane": "https://darwin.md/telefoane",
    "calculatoare": "https://darwin.md/calculatoare"
}

def fetch_products(category_url, valid_categories=None, max_pages=10):
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
                "external_id": (re.search(r'"item_id":"(.*?)"', decoded) or [None, None])[1],
                "name": (re.search(r'"item_name":"(.*?)"', decoded) or [None, None])[1],
                "price": int((re.search(r'"price":(\d+)', decoded) or [0, 0])[1]),
                "brand": (re.search(r'"item_brand":"(.*?)"', decoded) or [None, None])[1],
                "category": (re.search(r'"item_category":"(.*?)"', decoded) or [None, None])[1],
                "variant": (re.search(r'"item_variant":"(.*?)"', decoded) or ["", ""])[1].replace("\\", "").strip(),
                "url": link.get("href"),
                "shop": "Darwin",
            }

            # Filter by valid categories if provided
            if valid_categories and item_data["category"] not in valid_categories:
                continue

            # Try to get image
            img_tag = link.find_previous("div", class_="product-img").find("img")
            item_data["image"] = img_tag.get("data-src") if img_tag else None

            all_items.append(item_data)

    return all_items




class Command(BaseCommand):
    help = "Fetch products from Darwin.md and save to database"

    def add_arguments(self, parser):
        parser.add_argument(
            "--category",
            type=str,
            help="Category to fetch (monitoare, laptopuri, etc.)",
            default="monitoare"
        )
        parser.add_argument(
            "--pages",
            type=int,
            help="Number of pages to fetch",
            default=1)

    def handle(self, *args, **options):
        category = options["category"]
        pages = options["pages"]

        url = DARWIN_CATEGORIES.get(category)

        if not url:
            self.stdout.write(self.style.ERROR(f"Unknown category: {category}"))
            return

        self.stdout.write(f"Fetching products from {url} ...")
        items = fetch_products(url, valid_categories=None, max_pages=pages)
        self.stdout.write(self.style.SUCCESS(f"Found {len(items)} products"))

        for item_data in items:
            Product.objects.update_or_create(
                external_id=item_data["external_id"],
                defaults=item_data
            )
            self.stdout.write(f"Saved: {item_data['name']}")
            

        self.stdout.write(self.style.SUCCESS("Done fetching products!"))