import html
import re
import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from products.models import Product
import traceback
from products.utils.utils import normalize_db
from products.utils.shop_crawler_engine_log import random_sleep, shop_crawler_log


# Usage:
# python manage.py aggregation_engine --shop darwin --category pc --pages 1


def _random_sleep():
    times = 0

    def helper():
        nonlocal times
        times += 1
        shop_crawler_log(f"Received a 429 times from: {times}")
        if times == 2:
            random_sleep(60, 120)
        elif times == 3:
            random_sleep(900, 1000)
        else:
            random_sleep(30, 60)

    return helper


def fetch_xstore_products(category_url, max_pages=1):

    all_items = []
    random_sleep_ = _random_sleep()

    def safe_text(text):
        return text.strip() if text else ""

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"

        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            if resp.status_code == 429:
                random_sleep_()
        except requests.exceptions.RequestException:
            break

        soup = BeautifulSoup(resp.text, "lxml")
        nodes = soup.select("figure.card-product")

        if not nodes:
            break

        for node in nodes:
            add_btn = node.select_one("a.xadd_tocard")
            title_tag = node.select_one("a.xp-title")
            variant_tag = node.select_one("span.xp-attr")
            img_tag = node.select_one("a.img-wrap img")
            link_tag = node.select_one("a.img-wrap")

            if not add_btn or not title_tag:
                continue

            # Stock check (could be refined if XStore has explicit classes)
            in_stock = True

            name_text = safe_text(title_tag.get_text())
            variant_text = safe_text(variant_tag.get_text() if variant_tag else "")
            category_text = safe_text(add_btn.get("data-category") or "")

            item_data = {
                "external_id": add_btn.get("data-id"),
                "name": name_text,
                "variant": variant_text,
                "t_name": {"ro": name_text, "en": "", "ru": ""},
                "t_variant": {"ro": variant_text, "en": "", "ru": ""},
                "price": int(add_btn.get("data-price") or 0),
                "brand": add_btn.get("data-brand") or "",
                "category": category_text,
                "t_category": {"ro": category_text, "en": "", "ru": ""},
                "url": link_tag.get("href") if link_tag else None,
                "image": img_tag.get("src") if img_tag else None,
                "shop": "xstore",
                "in_stock": in_stock,
            }

            all_items.append(item_data)

        random_sleep(2, 10)

    return all_items


def fetch_enter_products(category_url, max_pages=1):
    all_items = []
    random_sleep_ = _random_sleep()

    def safe_re_search(pattern, text, group=1, default=""):
        m = re.search(pattern, text)
        return m.group(group) if m else default

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"

        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            if resp.status_code == 429:
                random_sleep_()
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
                else:
                    continue

            if not raw:
                continue

            decoded = html.unescape(raw)

            external_id = safe_re_search(r'"item_id":"(.*?)"', decoded)
            price = int(safe_re_search(r'"price":(\d+)', decoded, default="0"))
            brand = safe_re_search(r'"item_brand":"(.*?)"', decoded)
            category = safe_re_search(r'"item_category":"(.*?)"', decoded)

            item_data = {
                "external_id": external_id,
                "name": title,
                "variant": variant,
                "t_name": {"ro": title, "en": "", "ru": ""},
                "t_variant": {"ro": variant, "en": "", "ru": ""},
                "price": price,
                "brand": brand,
                "category": category,
                "t_category": {"ro": category, "en": "", "ru": ""},
                "url": node.select_one(".stretched-link")["href"] or "",
                "in_stock": in_stock,
                "shop": "Enter",
            }

            all_items.append(item_data)

        random_sleep(2, 10)

    return all_items


def fetch_darwin_products(category_url, max_pages=1):
    all_items = []
    random_sleep_ = _random_sleep()

    def safe_re_search(pattern, text, group=1, default=""):
        m = re.search(pattern, text)
        return m.group(group) if m else default

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code == 429:

                random_sleep_()
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

            name = safe_re_search(r'"item_name":"(.*?)"', decoded)
            variant = safe_re_search(r'"item_variant":"(.*?)"', decoded)
            category = safe_re_search(r'"item_category":"(.*?)"', decoded)
            external_id = safe_re_search(r'"item_id":"(.*?)"', decoded)
            brand = safe_re_search(r'"item_brand":"(.*?)"', decoded)
            price = int(safe_re_search(r'"price":(\d+)', decoded, default="0"))

            item_data = {
                "external_id": external_id,
                "name": name,
                "variant": variant,
                "t_name": {"ro": name, "en": "", "ru": ""},
                "t_variant": {"ro": variant, "en": "", "ru": ""},
                "price": price,
                "brand": brand,
                "category": category,
                "t_category": {"ro": category, "en": "", "ru": ""},
                "url": link.get("href") or "",
                "in_stock": in_stock,
                "shop": "darwin",
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
    "xstore": {
        "function": fetch_xstore_products,
        "laptop": "https://xstore.md/laptopuri",
        "laptopaccessories": "https://xstore.md/accesorii-laptopuri",
        "software": "https://xstore.md/software",
        "headphones": "https://xstore.md/casti",
        "accessories": "https://xstore.md/accesorii",
        "pc": "https://xstore.md/calculatoare-pc",
        "setuppc": "https://xstore.md/setup-pc-gaming",
        "consolegaming": "https://xstore.md/console-gaming",
        "componentspc": "https://xstore.md/componente-pc",
        "apple": "https://xstore.md/apple",
        "allinonepc": "https://xstore.md/all-in-one-pc",
        "brandpc": "https://xstore.md/brand-pc",
        "minipc": "https://xstore.md/mini-pc",
        "phones": "https://xstore.md/telefoane",
        "tablete": "https://xstore.md/tablete",
        "perifericp": "https://xstore.md/periferice-pc",
        "monitoare": "https://xstore.md/monitoare",
        "scaune": "https://xstore.md/scaune",
        "televizoare": "https://xstore.md/televizoare",
        "accesoriitv": "https://xstore.md/accesorii-tv",
        "imprimante": "https://xstore.md/imprimante",
        "tehnicadebirou": "https://xstore.md/tehnica-de-birou",
        "proiectoaresiecrane": "https://xstore.md/proiectoare-si-ecrane",
        "aspiratoarerobot": "https://xstore.md/aspiratoare-robot",
    },
}


class Command(BaseCommand):

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

    def handle(self, *args, **options):
        try:
            category = options["category"]
            shop = options["shop"]
            pages = options["pages"]

            shop_cfg = CATEGORIES.get(shop)
            url = shop_cfg.get(category) if shop_cfg else None
            fetch_fn = shop_cfg.get("function") if shop_cfg else None

            if not url or not fetch_fn:
                shop_crawler_log(
                    f"ERROR Unknown category/shop/pages: {category} / {shop} / {pages}"
                )
                return

            shop_crawler_log(
                f"START Fetching products | shop={shop} category={category}"
            )

            items = fetch_fn(url, pages)

            shop_crawler_log(f"FOUND {len(items)} products")

            saved_count = 0
            updated_count = 0

            for item_data in items:
                try:
                    _, created = Product.objects.using(shop).update_or_create(
                        shop=item_data["shop"],
                        external_id=item_data["external_id"],
                        defaults=item_data,
                    )

                    if created:
                        saved_count += 1
                        shop_crawler_log(f"CREATED {item_data['name']}")
                    else:
                        updated_count += 1
                        shop_crawler_log(f"UPDATED {item_data['name']}")

                except Exception as e:
                    shop_crawler_log(
                        f"ERROR saving {item_data.get('name', 'Unknown')}: {e}"
                    )

            shop_crawler_log(
                f"SUMMARY shop={shop} category={category} "
                f"created={saved_count} updated={updated_count}"
            )
            shop_crawler_log("END aggregation_engine run")
            shop_crawler_log("=" * 60)

        except KeyboardInterrupt:
            shop_crawler_log("INTERRUPTED by user")
        except Exception as e:
            shop_crawler_log(f"FATAL error: {e}")
            shop_crawler_log(traceback.format_exc())
