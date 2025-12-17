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




def fetch_products(category_url, valid_categories=None, max_pages=10):
    all_items = []

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        links = soup.select("a[data-ga4]")

        if not links:
            break  # no more pages

        for link in links:
            raw = link.get("data-ga4")
            decoded = html.unescape(raw)

            item_data = {
                "id": (re.search(r'"item_id":"(.*?)"', decoded) or [None])[1],
                "name": (re.search(r'"item_name":"(.*?)"', decoded) or [None])[1],
                "price": int((re.search(r'"price":(\d+)', decoded) or [0])[1]),
                "brand": (re.search(r'"item_brand":"(.*?)"', decoded) or [None])[1],
                "category": (re.search(r'"item_category":"(.*?)"', decoded) or [None])[1],
                "variant": (re.search(r'"item_variant":"(.*?)"', decoded) or [""])[1].replace("\\", "").strip(),
                "url": link.get("href"),
            }

            # Filter by valid categories if provided
            if valid_categories and item_data["category"] not in valid_categories:
                continue

            # Try to get image
            img_tag = link.find_previous("div", class_="product-img").find("img")
            item_data["image"] = img_tag.get("data-src") if img_tag else None

            all_items.append(item_data)

    return all_items



DARWIN_CATEGORIES = {
    "monitoare": "https://darwin.md/monitoare",
    "laptopuri": "https://darwin.md/laptopuri",
    "telefoane": "https://darwin.md/telefoane",
    "calculatoare": "https://darwin.md/calculatoare"
}

# Example: fetch monitors
monitors = fetch_products(DARWIN_CATEGORIES["monitoare"], valid_categories=["Monitoare", "Monitoare gaming"])
print(len(monitors), "monitors found")

# Example: fetch laptops
laptops = fetch_products(DARWIN_CATEGORIES["laptopuri"])
print(len(laptops), "laptops found")