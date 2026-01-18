import html
import json
import re
from bs4 import BeautifulSoup
from products.management.commands.shop_crawler_engine.infra.http import RateLimiter
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


class Crawler:
    """Unified class for all shops."""

    def __init__(self):
        self.rate_limiters = {
            "xstore": RateLimiter(
                shop="xstore",
                robotics_url="https://xstore.md/",
            ),
            "enter": RateLimiter(
                shop="enter",
                robotics_url="https://enter.online/",
            ),
            "darwin": RateLimiter(
                shop="darwin",
                robotics_url="https://darwin.md/",
            ),
        }

    @staticmethod
    def safe_text(text):
        return text.strip() if text else ""

    @staticmethod
    def safe_re_search(pattern, text, group=1, default=""):
        m = re.search(pattern, text)
        return m.group(group) if m else default

    def fetch_xstore(self, category_url, max_pages=1, out_of_stock_limit=75):
        limiter = self.rate_limiters["xstore"]
        unavailable_count = 0

        for page in range(1, max_pages + 1):
            url = f"{category_url}?page={page}"
            resp = limiter.make_request(url)
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

                name_text = self.safe_text(title_tag.get_text())
                variant_text = self.safe_text(
                    variant_tag.get_text() if variant_tag else ""
                )
                category_text = self.safe_text(add_btn.get("data-category") or "")
                in_stock = True

                yield {
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

    def fetch_enter(self, category_url, max_pages=1, out_of_stock_limit=75):
        """
        Fetch products from Enter shop.
        Stops early if too many consecutive items are out of stock in this category.
        """
        limiter = self.rate_limiters["enter"]
        unavailable_count = 0

        for page in range(1, max_pages + 1):
            url = f"{category_url}?page={page}"
            resp = limiter.make_request(url)
            if not resp:
                break

            soup = BeautifulSoup(resp.text, "lxml")
            nodes = soup.select("div.product-item[data-gtm]")
            if not nodes:
                break

            for node in nodes:
                raw = node.get("data-gtm")
                if not raw:
                    continue

                title_tag = node.select_one(".product-title")
                title = title_tag.get_text(strip=True) if title_tag else ""
                variant_tag = node.select_one(".product-desc")
                variant = variant_tag.get_text(strip=True) if variant_tag else ""

                in_stock = True
                add_btn = node.select_one("button[data-action]")

                if add_btn and add_btn.get("data-action") in "openOutStockModal":
                    in_stock = False

                if "out-of-stock" in node.get("class", []):
                    in_stock = False

                try:
                    decoded = json.loads(html.unescape(raw))
                    item = decoded.get("ecommerce", {}).get("items", [{}])[0]
                    # Some shops may include availability
                    if item.get("availability") == "out_of_stock":
                        in_stock = False
                except Exception:
                    pass
                if not in_stock:
                    unavailable_count += 1
                else:
                    unavailable_count = 0
                yield {
                    "external_id": self.safe_re_search(r'"item_id":"(.*?)"', raw),
                    "name": title,
                    "variant": variant,
                    "t_name": {"ro": title, "en": "", "ru": ""},
                    "t_variant": {"ro": variant, "en": "", "ru": ""},
                    "price": int(
                        self.safe_re_search(r'"price":(\d+)', raw, default="0")
                    ),
                    "brand": self.safe_re_search(r'"item_brand":"(.*?)"', raw),
                    "category": self.safe_re_search(r'"item_category":"(.*?)"', raw),
                    "t_category": {"ro": title, "en": "", "ru": ""},
                    "url": (
                        node.select_one(".stretched-link")["href"]
                        if node.select_one(".stretched-link")
                        else ""
                    ),
                    "in_stock": in_stock,
                    "shop": "enter",
                }

                if unavailable_count >= out_of_stock_limit:
                    return

    def fetch_darwin(self, category_url, max_pages=1, out_of_stock_limit=75):
        """
        Fetch products from Darwin shop.

        Stops early if too many consecutive items are out of stock in this category.
        """
        limiter = self.rate_limiters["darwin"]
        consecutive_unavailable = 0

        for page in range(1, max_pages + 1):
            url = f"{category_url}?page={page}"
            resp = limiter.make_request(url)
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

                if not raw:
                    continue

                in_stock = True
                # Darwin marks out-of-stock with a specific class
                if "out-of-stock" in node.get("class", []):
                    in_stock = False
                    consecutive_unavailable += 1
                else:
                    consecutive_unavailable = 0  # reset if we find an in-stock item

                if consecutive_unavailable >= out_of_stock_limit:
                    shop_crawler_log(
                        f"[STOPPER] shop=darwin {consecutive_unavailable} consecutive items out of stock in {category_url}"
                    )
                    return
                # stop crawling this category
                decoded = html.unescape(raw)

                yield {
                    "external_id": self.safe_re_search(r'"item_id":"(.*?)"', decoded),
                    "name": self.safe_re_search(r'"item_name":"(.*?)"', decoded),
                    "variant": self.safe_re_search(r'"item_variant":"(.*?)"', decoded),
                    "t_name": {"ro": "", "en": "", "ru": ""},
                    "t_variant": {"ro": "", "en": "", "ru": ""},
                    "price": int(
                        self.safe_re_search(r'"price":(\d+)', decoded, default="0")
                    ),
                    "brand": self.safe_re_search(r'"item_brand":"(.*?)"', decoded),
                    "category": self.safe_re_search(
                        r'"item_category":"(.*?)"', decoded
                    ),
                    "t_category": {"ro": "", "en": "", "ru": ""},
                    "url": link.get("href") or "",
                    "in_stock": in_stock,
                    "shop": "darwin",
                }
