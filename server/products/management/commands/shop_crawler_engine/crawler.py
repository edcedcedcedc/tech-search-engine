import html
import re
from bs4 import BeautifulSoup
from products.management.commands.shop_crawler_engine.infra.http import RateLimiter
from products.management.commands.shop_crawler_engine.utils import random_sleep
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


class Crawler:
    """Unified class for all shops."""

    def __init__(self):
        self.rate_limiters = {
            "xstore": RateLimiter(shop="xstore", min_delay=3, max_delay=10),
            "enter": RateLimiter(shop="enter", min_delay=4, max_delay=12),
            "darwin": RateLimiter(shop="darwin", min_delay=5, max_delay=15),
        }

    @staticmethod
    def safe_text(text):
        return text.strip() if text else ""

    @staticmethod
    def safe_re_search(pattern, text, group=1, default=""):
        m = re.search(pattern, text)
        return m.group(group) if m else default

    def fetch_xstore(self, category_url, max_pages=1):
        limiter = self.rate_limiters["xstore"]
        count = 0

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
                count += 1
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

            if count % 15 == 0:
                shop_crawler_log(
                    f"Processed {count} items for enter, taking a human-like break..."
                )
                random_sleep(10, 30)
            shop_crawler_log(f"Sleeping for xstore to avoid overloading...")
            random_sleep(2, 10)

    def fetch_enter(self, category_url, max_pages=1):
        limiter = self.rate_limiters["enter"]
        unavailable_count = 0  # count unavailable items per category
        total_count = 0

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
                title_tag = node.select_one(".product-title")
                title = title_tag.get_text(strip=True) if title_tag else ""
                variant_tag = node.select_one(".product-desc")
                variant = variant_tag.get_text(strip=True) if variant_tag else ""
                in_stock = True
                add_btn = node.select_one("button[data-action]")
                if add_btn and add_btn.get("data-action") == "openOutStockModal":
                    in_stock = False
                    unavailable_count += 1  # increment if out of stock

                if not raw:
                    continue

                decoded = html.unescape(raw)
                yield {
                    "external_id": self.safe_re_search(r'"item_id":"(.*?)"', decoded),
                    "name": title,
                    "variant": variant,
                    "t_name": {"ro": title, "en": "", "ru": ""},
                    "t_variant": {"ro": variant, "en": "", "ru": ""},
                    "price": int(
                        self.safe_re_search(r'"price":(\d+)', decoded, default="0")
                    ),
                    "brand": self.safe_re_search(r'"item_brand":"(.*?)"', decoded),
                    "category": self.safe_re_search(
                        r'"item_category":"(.*?)"', decoded
                    ),
                    "t_category": {"ro": title, "en": "", "ru": ""},
                    "url": node.select_one(".stretched-link")["href"] or "",
                    "in_stock": in_stock,
                    "shop": "enter",
                }

                total_count += 1
                if total_count % 15 == 0:
                    shop_crawler_log(
                        f"Processed {total_count} items for enter, taking a human-like break..."
                    )
                    random_sleep(10, 30)

                # Guard: skip category if too many unavailable
                if unavailable_count > 200:
                    shop_crawler_log(
                        f"[SKIP CATEGORY] More than 200 unavailable items in {category_url}, skipping remaining pages."
                    )
                    return  # stop this generator for this category

            shop_crawler_log(f"Sleeping for enter to avoid overloading...")
            random_sleep(2, 10)

    def fetch_darwin(self, category_url, max_pages=1):
        limiter = self.rate_limiters["darwin"]
        count = 0

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

                in_stock = False if "out-of-stock" in node.get("class", []) else True
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
                if count % 15 == 0:
                    shop_crawler_log(
                        "Processed {count} items for darwin, taking a human-like break..."
                    )
                random_sleep(10, 30)

            shop_crawler_log(f"Sleeping for darwin to avoid overloading...")
            random_sleep(2, 10)
