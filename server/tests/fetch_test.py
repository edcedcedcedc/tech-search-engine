import html
import json
import requests
from bs4 import BeautifulSoup
import re


def fetch_enter_products(category_url, max_pages=1, timeout=15):
    """
    Fetch products from Enter shop.

    Returns a list of product dicts with in_stock=True/False.
    Uses requests for testing instead of rate limiter.
    """
    results = []
    unavailable_count = 0

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0 Safari/537.36"
            )
        }
    )

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"

        try:
            resp = session.get(url, timeout=timeout)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"[REQUEST-FAIL] enter {url} → {e}")
            break

        soup = BeautifulSoup(resp.text, "lxml")
        nodes = soup.select("div.product-item[data-gtm]")
        if not nodes:
            break

        for node in nodes:
            raw = node.get("data-gtm")
            if not raw:
                continue

            decoded = html.unescape(raw)

            title_tag = node.select_one(".product-title")
            title = title_tag.get_text(strip=True) if title_tag else ""
            variant_tag = node.select_one(".product-desc")
            variant = variant_tag.get_text(strip=True) if variant_tag else ""

            # ---------- STOCK DETECTION ----------
            in_stock = True
            add_btn = node.select_one("button[data-action]")

            if add_btn and add_btn.get("data-action") == "openOutStockModal":
                in_stock = False
            elif "out-of-stock" in node.get("class", []):
                in_stock = False

            category = safe_re_search(r'"item_category":"(.*?)"', decoded)
            results.append(
                {
                    "external_id": safe_re_search(r'"item_id":"(.*?)"', decoded),
                    "name": title,
                    "variant": variant,
                    "t_name": {"ro": title, "en": "", "ru": ""},
                    "t_variant": {"ro": variant, "en": "", "ru": ""},
                    "price": int(
                        safe_re_search(r'"price":(\d+)', decoded, default="0")
                    ),
                    "brand": safe_re_search(r'"item_brand":"(.*?)"', decoded),
                    "category": category,
                    "t_category": {"ro": category, "en": "", "ru": ""},
                    "url": (
                        node.select_one(".stretched-link")["href"]
                        if node.select_one(".stretched-link")
                        else ""
                    ),
                    "in_stock": in_stock,
                    "shop": "enter",
                }
            )

    return results


def fetch_xstore_products(category_url, max_pages=1):

    results = []
    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        try:
            resp = requests.session.get(url, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"[REQUEST-FAIL] enter {url} → {e}")
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
            variant_text = self.safe_text(variant_tag.get_text() if variant_tag else "")
            category_text = self.safe_text(add_btn.get("data-category") or "")
            in_stock = True

            results.append(
                {
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
            )
        return results


import requests
from bs4 import BeautifulSoup
import html
import re


def safe_re_search(pattern, text, default=""):
    match = re.search(pattern, text)
    return match.group(1) if match else default


def fetch_darwin_products(category_url, max_pages=1, timeout=15):
    """
    Fetch products from Darwin shop.

    Returns a list of product dicts with in_stock=True/False.
    """
    results = []

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0 Safari/537.36"
            )
        }
    )

    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"

        try:
            resp = session.get(url, timeout=timeout)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"[REQUEST-FAIL] darwin {url} → {e}")
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

            # ---------- STOCK DETECTION ----------
            classes = node.get("class", [])
            has_out_class = "out-of-stock" in classes
            has_notify_btn = (
                node.select_one('[wire\\:click*="toggleNotificationModal"]') is not None
            )
            has_add_to_cart = (
                node.select_one('[wire\\:click*="addProductToCart"]') is not None
            )

            in_stock = not has_out_class and has_add_to_cart and not has_notify_btn

            # ---------- GA4 PARSING ----------
            decoded = html.unescape(raw)

            variant_node = node.select_one(".title-description .fs-12")
            variant = variant_node.text.strip() if variant_node else ""

            results.append(
                {
                    "external_id": safe_re_search(r'"item_id":"(.*?)"', decoded),
                    "name": safe_re_search(r'"item_name":"(.*?)"', decoded),
                    "variant": variant,
                    "t_name": {"ro": "", "en": "", "ru": ""},
                    "t_variant": {"ro": "", "en": "", "ru": ""},
                    "price": int(
                        safe_re_search(r'"price":(\d+)', decoded, default="0")
                    ),
                    "brand": safe_re_search(r'"item_brand":"(.*?)"', decoded),
                    "category": safe_re_search(r'"item_category":"(.*?)"', decoded),
                    "t_category": {"ro": "", "en": "", "ru": ""},
                    "url": link.get("href") or "",
                    "in_stock": in_stock,
                    "shop": "darwin",
                }
            )

    return results


CATEGORIES = {
    "enter": {
        "function": fetch_enter_products,
        "laptop": "https://enter.online/laptopuri",
        "apple": "https://xstore.md/apple",
        "pentrulaptop": "https://enter.online/accesorii/pentru-laptop",
        "minipc": "https://enter.online/calculatoare/unitate-pc/mini",
        "pentrutableta": "https://enter.online/accesorii/pentru-tableta",
        "mobilephone": "https://enter.online/telefoane",
        "perifericepc": "https://enter.online/periferice-pc",
        "pc": "https://enter.online/calculatoare",
        "unitatepc": "https://enter.online/calculatoare/unitate-pc",
        "gaming": "https://enter.online/for-gamers",
        "televizoare": "https://enter.online/televizoare",
        "fotovideo": "https://enter.online/foto-video",
        "proiectoaresiecrane": "https://enter.online/echipamente-de-proiectie",
        "opticasiastronomie": "https://enter.online/optica-si-astronomie",
        "tehnicaaudio": "https://enter.online/tehnica-audio",
        "accesoriitv": "https://enter.online/accesorii/accesorii-tv",
        "smartwatch": "https://enter.online/gadgeturi/smartwatch",
        "brataritfitness": "https://enter.online/gadgeturi/bratari-fitness",
        "ceasurismartcopii": "https://enter.online/gadgeturi/smartwatch-pentru-copii",
        "accessorii": "https://enter.online/accesorii/pentru-ceasuri-si-bratari",
        "smarthome": "https://enter.online/gadgeturi/smart-home",
        "iluminare": "https://enter.online/iluminare",
        "divertisment": "https://enter.online/gadgeturi?ff[11][]=Dron%C4%83,VR+Glasses,AR+GUN,Robot,Ochelari",
        "statiiradio": "https://enter.online/gadgeturi/statii-radio",
        "acumulatoare": "https://enter.online/accesorii/acumulatoare",
        "software": "https://enter.online/programe-soft",
        "tehnicabirou": "https://enter.online/tehnica-de-birou",
        "cartielectronice": "https://enter.online/tablete/carti-electronice",
        "climatizare": "https://enter.online/climatizare",
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
        "gaming1": "https://darwin.md/gaming/periferice",
        "gaming2": "https://darwin.md/gaming/pc-si-laptopuri",
        "gaming3": "https://darwin.md/gaming/console",
        "gaming4": "https://darwin.md/gaming/jocuri",
        "gaming5": "https://darwin.md/gaming/scaune",
        "gaming6": "https://darwin.md/gadgets/ochelari-vr",
        "router": "https://darwin.md/retelistica/routere",
        "switch": "https://darwin.md/retelistica/switch",
    },
    "xstore": {
        "function": "",
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
        "scaune": "https://xstore.md/periferice-pc/scaune",
        "televizoare": "https://xstore.md/televizoare",
        "accesoriitv": "https://xstore.md/accesorii-tv",
        "imprimante": "https://xstore.md/imprimante",
        "tehnicadebirou": "https://xstore.md/tehnica-de-birou",
        "proiectoaresiecrane": "https://xstore.md/proiectoare-si-ecrane",
        "aspiratoarerobot": "https://xstore.md/aspiratoare-robot",
        "ceasuri": "https://xstore.md/ceasuri-si-bratari-inteligente",
        "cameraaction": "https://xstore.md/gadgeturi/camere-action",
        "boxe": "https://xstore.md/boxe",
    },
}


# Example: fetch monitors
""" items = fetch_enter_products(
    CATEGORIES["enter"]["proiectoaresiecrane"],
    max_pages=8,
) """

items = fetch_enter_products(
    CATEGORIES["enter"]["minipc"],
    max_pages=20,
)

print(f"\n{len(items)} items found (enter)\n")

print("idx | external_id       | in_stock | price | shop   | name | url")
print("-" * 100)

for i, p in enumerate(items, 1):
    print(
        f"{i:03d} | "
        f"{p['external_id']:<16} | "
        f"{int(p['in_stock']):^8} | "
        f"{p['price']:^5} | "
        f"{p['shop']:<6} | "
        f"{p['name']:<40} | "
        f"{p['variant']:<40} | "
        f"{p['url']}"
    )
