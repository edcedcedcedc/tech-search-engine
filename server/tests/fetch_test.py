import html
import requests
from bs4 import BeautifulSoup
import re

""" base_url = "https://darwin.md/monitoare?page={}"
all_items = []
page = 1
while True:
    url = base_url.format(page)
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    links = soup.select("a[data-ga4]")
    if not links:
        break  
    page += 1
    for link in links:
        raw = link.get("data-ga4")
        decoded = html.unescape(raw)


        item_id_match = re.search(r'"item_id":"(.*?)"', decoded)
        name_match = re.search(r'"item_name":"(.*?)"', decoded)
        price_match = re.search(r'"price":(\d+)', decoded)
        brand_match = re.search(r'"item_brand":"(.*?)"', decoded)
        category_match = re.search(r'"item_category":"(.*?)"', decoded)
        variant_match = re.search(r'"item_variant":"(.*?)"', decoded)

        item_data = {
            "id": item_id_match.group(1) if item_id_match else None,
            "name": name_match.group(1) if name_match else None,
            "price": int(price_match.group(1)) if price_match else None,
            "brand": brand_match.group(1) if brand_match else None,
            "category": category_match.group(1) if category_match else None,
            "variant": variant_match.group(1) if variant_match else "",
            "url": link.get("href"),
        }
        print(item_data)
 """


DARWIN_CATEGORIES = {
    "monitor": "https://darwin.md/monitoare",
    "laptop": "https://darwin.md/laptopuri",
    # "telefoane": "https://darwin.md/telefoane",
    "pc": "https://darwin.md/calculatoare",
}

ENTER_CATEGORIES = {
    "monitor": "https://enter.online/for-gamers/monitoare-gaming",
    "laptop": "https://enter.online/laptopuri",
    # "telefoane": "https://darwin.md/telefoane",
    "pc": "https://enter.online/calculatoare",  # all junk hdds, monitors, gpus...etc
}


def fetch_enter_products(category_url, valid_categories=None, max_pages=5):
    all_items = []

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        # Select product cards
        links = soup.select("div.product-item[data-gtm]")

        if not links:
            raise Exception("No links in darwin products")

        for link in links:
            in_stock = True
            add_btn = link.select_one("button[data-action]")
            if add_btn:
                action = add_btn.get("data-action", "")
                if action == "openOutStockModal":
                    in_stock = False

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
                "in_stock": in_stock,
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

        cards = soup.select("div.product-card.product-item")
        if not cards:
            break

        for card in cards:
            # ✅ stock detection
            in_stock = "out-of-stock" not in card.get("class", [])

            link = card.select_one("a[data-ga4]")
            if not link:
                continue

            raw = link.get("data-ga4")
            if not raw:
                continue

            decoded = html.unescape(raw)

            item_data = {
                "id": (re.search(r'"item_id":"(.*?)"', decoded) or [None, None])[1],
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
                "in_stock": in_stock,
                "shop": "Darwin",
            }

            all_items.append(item_data)

    return all_items


# Example: fetch monitors
monitors = fetch_darwin_products(
    DARWIN_CATEGORIES["monitor"],
)
print(len(monitors), "monitors found darwin", monitors)


monitors = fetch_enter_products(
    ENTER_CATEGORIES["laptop"],
)
# print(len(monitors), "monitors found enter", monitors)
