import html
import re
from bs4 import BeautifulSoup
from products.management.commands.shop_crawler_engine.infra.http import RateLimiter
from products.utils.log.shop_crawler_engine_log import random_sleep


def fetch_xstore_products(category_url, max_pages=1):
    """
    Fetch products from XStore category pages.
    """
    rate_limiter = RateLimiter()

    def safe_text(text):
        return text.strip() if text else ""

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"

        resp = rate_limiter.make_request(url)
        if not resp:
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

            # Stock check
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

            yield item_data

        random_sleep(2, 10, "xtore")


def fetch_enter_products(category_url, max_pages=1):
    rate_limiter = RateLimiter()

    def safe_re_search(pattern, text, group=1, default=""):
        m = re.search(pattern, text)
        return m.group(group) if m else default

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"

        resp = rate_limiter.make_request(url)
        if not resp:
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
                # else:
                #    continue

            if not raw:
                continue

            decoded = html.unescape(raw)

            external_id = safe_re_search(r'"item_id":"(.*?)"', decoded)
            price = int(safe_re_search(r'"price":(\d+)', decoded, default="0"))
            brand = safe_re_search(r'"item_brand":"(.*?)"', decoded)
            category_text = safe_re_search(r'"item_category":"(.*?)"', decoded)

            item_data = {
                "external_id": external_id,
                "name": title,
                "variant": variant,
                "t_name": {"ro": title, "en": "", "ru": ""},
                "t_variant": {"ro": variant, "en": "", "ru": ""},
                "price": price,
                "brand": brand,
                "category": category_text,
                "t_category": {"ro": category_text, "en": "", "ru": ""},
                "url": node.select_one(".stretched-link")["href"] or "",
                "in_stock": in_stock,
                "shop": "enter",
            }

            yield item_data

        random_sleep(2, 10, "enter")


def fetch_darwin_products(category_url, max_pages=1):
    rate_limiter = RateLimiter()

    def safe_re_search(pattern, text, group=1, default=""):
        m = re.search(pattern, text)
        return m.group(group) if m else default

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"

        resp = rate_limiter.make_request(url)
        if not resp:
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
                continue

            if not raw:
                continue

            decoded = html.unescape(raw)

            name = safe_re_search(r'"item_name":"(.*?)"', decoded)
            variant = safe_re_search(r'"item_variant":"(.*?)"', decoded)
            category_text = safe_re_search(r'"item_category":"(.*?)"', decoded)
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
                "category": category_text,
                "t_category": {"ro": category_text, "en": "", "ru": ""},
                "url": link.get("href") or "",
                "in_stock": in_stock,
                "shop": "darwin",
            }
            yield item_data

        random_sleep(2, 10, "darwin")
