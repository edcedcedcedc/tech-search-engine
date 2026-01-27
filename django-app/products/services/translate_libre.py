import os
import random
import signal
import sys
import time
import threading

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aggregator.settings")
import django

django.setup()

from django.db import OperationalError, models
from products.models import Product
from products.utils.log.translation_log import translation_log
import requests

LIBRETRANSLATE_URL = os.environ.get(
    "LIBRETRANSLATE_URL", "http://localhost:5000/translate"
)


import re


STOP_WORDS = [
    # Brands & Manufacturers
    "HP",
    "Dell",
    "Lenovo",
    "Acer",
    "Asus",
    "MSI",
    "Apple",
    "Samsung",
    "Microsoft",
    "Sony",
    "LG",
    "Toshiba",
    "Razer",
    "Corsair",
    "Logitech",
    "HyperX",
    "SteelSeries",
    "BenQ",
    "ViewSonic",
    "AOC",
    "Gigabyte",
    "ASRock",
    "EVGA",
    "VGA",
    "NZXT",
    "Cooler Master",
    "Noctua",
    "be quiet!",
    "Seasonic",
    "Western Digital",
    "Seagate",
    "Crucial",
    "Kingston",
    "SanDisk",
    "Intel",
    "AMD",
    "NVIDIA",
    "Google",
    "Amazon",
    "Motorola Moto",
    "Xiaomi",
    "Redmi",
    "Hagel",
    "Hisense",
    "Herz",
    "Amber",
    "Note",
    "Meta",
    "Honor",
    "emmas",
    "Oculus",
    "Valve",
    "Xiaomi",
    "bosch",
    "benfakto",
    "Huawei",
    "Pereko",
    "Ulefone",
    "OnePlus",
    "Poco",
    "Eaton",
    "Gembird",
    "Boya",
    "Realme",
    "Be Quiet",
    "Immergas",
    "Victrix",
    "Zeus",
    "Superior",
    "be quiet",
    "be quiet!",
    "Be Quiet!",
    "Synology Surveillance Station",
    "Microsoft Office",
    "KASPERSKY",
    "Philips",
    "Havit",
    "Lenovo",
    "Hama",
    "Navigator",
    "Asus",
    "Kingston",
    "DataTravel",
    "Pebble",
    "Helmet",
    "UPS PowerCom",
    "UPS",
    "Mikrotik cAp ax",
    "Lenovo",
    "osprey",
    "Transporter",
    "Generica",
    "power",
    "energy",
    "gel",
    "Hator",
    "Logitech",
    "DemirDokum",
    "Airfel",
    "Itap",
    "Genus",
    "Resanta",
    "Radex",
    "Style",
    "Thermex Ricco",
    "HygroWave",
    "Western",
    "Digital",
    "Gold",
    "Viessmann",
    "Vitodens",
    "Airfel",
    "Digital",
    "IEK",
    "Rightlight",
    "Enterprise",
    "Toshiba",
    "Ikea",
    "Neo",
    "Zipro",
    "Volume",
    "Capital",
    "Sports",
    "FitTronic",
    "Marshall",
    "Thunder Wings",
    "Sky",
    "Dekora",
    "Land",
    "4Play",
    "Suhs",
    "Insportline Dremar",
    "Insporline",
    "ROMANA",
    "Orion",
    "yamaha",
    "ibanez",
    "hercules",
    "Fender",
    "Casio",
    "Startone",
    "Star Drum",
    "Roland",
    "pro",
    "mark",
    "hebikuo",
    "Squier",
    "Arturia",
    "Keylab",
    "Essential",
    "ortega",
    "Konig & Meyer",
    "baby-spider",
    "Pro",
    "mini",
    "sub",
    "atomic",
    "fast",
    "gewa",
    "DAddario" "Natural",
    "rosin",
    "light",
    "classic",
    "millennium",
    "Novation",
    "MiniNova",
    "Novation",
    "Impulse",
    "Journey",
    "fiesta",
    "plus",
    "academy" "aria",
    "boss",
    "air",
    "compact",
    "Karl Hoffmeister",
    "korg",
    "volca",
    "keys",
    "novation",
    "midi",
    "academy",
    "stick",
    "pro",
    "pearl",
    "millenium",
    "millenium",
    "mainain",
    "Greathen",
    "greaten",
    "Novation",
    "new",
    "POETRY",
    "Chopen",
    "Corzi",
    "Meinl",
    "Gravity",
    "Conservatory",
    "Karl Hoffmeister",
    "Dunlop",
    "vandor",
    "java",
    "red",
    "cut",
    "Formula",
    "el",
    "nino",
    "65",
    "Polish",
    "Pearl",
    "Fender",
    "Sonic",
    "Stratocaster",
    "pack",
    "outfit",
    "River",
    "Essential",
    "Arcus",
    "CM",
    "audio",
    "parrot",
    "cons",
    "elmos",
    "trio",
    "tendo",
    "fender",
    "horoz",
    "hercules",
    "Elixir",
    "Polyweb",
    "Conservatory",
    "Flkey",
    "mini",
    "set",
    "Flame",
    "tetra",
    "Fender Frontman",
    "Lighting",
    "body",
    "adoption",
    "orno",
    "Dunlop",
    "Harley Benton",
    "Meinl",
    "Enjoy",
    "set",
    "Vox",
    "Electr.Pathfinder",
    "D'Addario",
    "Funkey",
    "edition",
    "aria",
    "Quiklok",
    "Die",
    "Hard",
    "Pearl",
    "River",
    "Ortaga",
    "Harley Benton ",
    "Armstrong",
    "trio",
    "duo",
    "quadro",
    "VLM",
    "zilmet",
    "teplodar",
    "Kasan",
    "maico",
    "Horoz",
    "Trio Vapore",
    "Cantabile X",
    "Cablexpert",
    "Nacon",
    "Scoot and Ride Kiwi",
    "Kubber",
    "Tempered",
    "Glass",
    "Makita",
    "Cottonmoose",
    "North",
    "Met",
    "Crossover",
    "Panasonic",
    "Eneloop",
    "iwatch",
    "watch",
    "Apple",
    "Scoot and Ride Rose",
    "Soundstil",
    "steinbach",
    "Amplug2 Classic Rock",
    "classic",
    "rock",
    "hard",
    "power",
    "Grizzly",
    "Patona",
    "CCS",
    "Cottonmoose",
    "Moose",
    "American",
    "Tourister",
    "Sunchaser",
    "Kikka",
    "Boo",
    "Dots",
    "dual",
    "Avenli",
    "Protect",
    "KryoSheet",
    "Braum",
    "Flame",
    "McGrey",
    "Orno",
    "Sport",
    "Arena",
    "Samboard",
    "Apacer",
    "Horoz Pardus",
    "Immergas Eolo",
    "Gorgiel",
    "crest",
    "kawai",
    "Compact",
    "Samsonite",
    "Valve",
    "Aquafill",
    "Sensillo",
    "Indiana",
    "Perfetto",
    "gorenje",
    "Terso",
    "XXL",
    "Russell Hobbs",
    "Elica Missy",
    "LX",
    "Beko",
    "Delonghi",
    "Gimi" "Resanta",
    "Moni",
    "sven",
    "pillis",
    "Inkjet",
    "Epson",
    "Glossy",
    "Airlux",
    "GoClever",
    "Nano",
    "Droid",
    "Cot clima",
    "Tech-Protect Hardshell",
    "Kamoto",
    "Steinbach",
    "total",
    "intix",
    "Hikoki",
    "Термiя",
    "Carrefour Toslink",
    "toslink",
    "maktek",
    "tip",
    "radiva",
    "Beltehkom",
    "Rexant",
    "raider",
    "basic",
    "hydro",
    "hydro-s",
    "zilmet",
    "monarch",
    "Gorgiel Mars",
    "gorgiel",
    "mars",
    "INNOTROLL",
    "Imprese i-Heat",
    "Teu Clima",
    "Vaillant",
    "Europlast",
    "TEKNIX",
    "ESPRO",
    "Canon",
    "Canon imageRUNNER",
    "Ariston",
    "Profi",
    "solid",
    "silent",
    "zilment",
    "VentEurope",
    "FINE",
    "Reductie",
    "reduction",
    "Perfetto",
    "Lion",
    "Kraft&Dele",
    "Perfetto",
    "Kronas",
    "Zmeica",
    "Caldera",
    "Megatherm",
    "Plus",
    "Auraton",
    "Tucana",
    "Ecotermal",
    "Kumtel",
    "amber",
    "alfa",
    "elite",
    "Gorgiel",
    "EASY",
    "ice",
    "KNX",
    "Ecocondens",
    "GOLD",
    "Mario",
    "Lux",
    "Clima",
    "vessel",
    "Sharp",
    "Epson",
    "Pop keys",
    "Rockfall",
    "ROG",
    "Zephyrus",
    "Logitech",
    "G PRO",
    "Polaris",
    "Tefal",
    "Hansa",
    "HyperX",
    "euroterm",
    "DICITI",
    "SLIM",
    "Cloud",
    "Stinger",
    # Marketing terms & series names
    "Pro",
    "Max",
    "Plus",
    "Ultra",
    "Recaro",
    "Vario",
    "Footmuff",
    "Kingston",
    "Canvas",
    "Go",
    "plus",
    "gen",
    "Extreme",
    "Elite",
    "Premium",
    "Edition",
    "Series",
    "Master",
    "Champion",
    "Victory",
    "TUF",
    "ROG",
    "Predator",
    "Nitro",
    "Legion",
    "IdeaPad",
    "ThinkPad",
    "ThinkCentre",
    "ThinkBook",
    "Surface",
    "Galaxy",
    "ZenBook",
    "VivoBook",
    "ExpertBook",
    "Inspiron",
    "XPS",
    "Alienware",
    "Vostro",
    "Latitude",
    "Precision",
    "OptiPlex",
    "Victrix",
    "Lifetime",
    # Retailer & marketplace terms
    "Amazon",
    "eBay",
    "Kingston",
    "Fury",
    "Beast",
    "MSI",
    "Newegg",
    "Best Buy",
    "bestway",
    "Walmart",
    "Target",
    "Micro Center",
    "B&H",
    "Adorama",
    "Refurbished",
    "Renewed",
    "Open Box",
    "Certified",
    "Deuter",
    "Mondego",
    "forever",
    "venzo",
    "babyjam",
    "Könner & Söhnen",
    "Seller",
    "Store",
    "Outlet",
    "Warehouse",
    "Premium",
    "Clima",
    "Radiva Haiti",
    "hoco",
    "Freon Accelerate",
    "freon",
    "electrolux",
    "Euroterm",
    # Condition & packaging
    "Sealed",
    "Unopened",
    "Original Box",
    "Packaging",
    "With Box",
    "Without Box",
    "Bulk",
    "OEM",
    "Retail",
    "Mid Tower",
    "mid tower",
    "Motorola",
    "motorola",
    # Common acronyms (context-dependent - be careful)
    # Consider whether to remove these based on your use case
    "SSD",
    "HDD",
    "NVMe",
    "SATA",
    "M.2",
    "PCIe",
    "USB",
    "HDMI",
    "DisplayPort",
    "VGA",
    "DVI",
    "LAN",
    "WiFi",
    "Bluetooth",
    "GPS",
    "NFC",
    "OLED",
    "LCD",
    "IPS",
    "TN",
    "VA",
    "QLED",
    "LED",
    "RGB",
    "ARGB",
    "DRAM",
    "DDR4",
    "DDR5",
    "GDDR6",
    "GDDR6X",
    "VRAM",
    # Resolution terms (might want to keep for filtering)
    "4K",
    "2K",
    "1080p",
    "1440p",
    "Ultra HD",
    "Full HD",
    "HD",
    "UHD",
    "QHD",
    "FHD",
    # GPU series (context-dependent)
    "RTX",
    "GTX",
    "RX",
    "GT",
    "Radeon",
    "GeForce",
    "Arc",
    "Quadro",
    "Titan",
    # CPU series (context-dependent)
    "Core",
    "Ryzen",
    "Threadripper",
    "Xeon",
    "Athlon",
    "Celeron",
    "Pentium",
    "Atom",
    # Connector types
    "Type-C",
    "Thunderbolt",
    "Ethernet",
    "Audio Jack",
    "3.5mm",
    "AUX",
    # Measurement units (usually keep for specs)
    # "inch", "Hz", "GHz", "MHz", "GB", "TB", "MB", "W", "V", "A", "mA", "mAh",
    # Generic descriptors
    "Computer"
    # Articles & prepositions
    # Colors (unless color is important for product differentiation)
    # Size descriptors
    "Small",
    "Medium",
    "Large",
    "Mini",
    "Micro",
    "Nano",
    "web",
    "nanoweb",
    "Compact",
    "Bespeco" "Slim",
    "Thin",
    "WIWU",
    # Warranty & bundle terms
    "Warranty",
    "Guarantee",
    "Insurance",
    "Bundle",
    "Combo",
    "Kit",
    "Set",
    "Package",
    "Includes",
    "Including",
    "Complete",
    "Full",
    "Partial",
    # Time references
    "2023",
    "2024",
    "2025",
    "2026",
    "Latest",
    "Newest",
    "Recent",
    "Old",
    "Previous",
    "Older",
    # Country/region specific (if not needed)
    "US",
    "USA",
    "UK",
    "EU",
    "European",
    "International",
    "Global",
    "Worldwide",
    "Lightwave",
    "Flame UK",
    "Hymel",
    "Osann FeetUp",
    "Zamel",
    "APC +",
    "Makita XGT",
    "Proove Pure Max",
    "Verbatim",
    "Zaffiro",
    "5g",
    "Met",
    "Mobilite",
    "GrowUP",
    "Sensillo Kwiaty",
    "Moni AirLuxe",
    "Marumi",
    "Case Logic Era Medium",
    "Vanguard VEO SELECT",
    "Algezid Melpool",
    "Deepcool",
    "Deep cool",
    "Chemoform Flockfix",
    "Planet Pool",
    "MoMi Footmuf",
    "DJI Zenmuse",
    "Zenmuse",
    "Bestway",
    "Panasonic",
    "Ultra",
    "ultra",
    "Samsung",
    "Samsung Galaxy",
    "Galaxy",
    "Full",
    "Turbo",
    "Air Mini",
    "E-Extra",
    "Standart",
    "Standard",
    "stand",
    "shield",
    "ishield",
    "bachmann",
    "connectus",
    "fold",
    "Samsonite",
    "rapid",
    "proove",
    "reserve",
    "Alkaya",
    "Respark",
    "Belkin",
    "Vanguard",
    "Dewalt",
    "Qi2",
    "Easy",
    "GO",
    "Maxi",
    "Cosi",
    "Virage",
    "set",
    "Proove",
    "Silicone",
    "Power",
    "Jelly",
    "Sillicone",
    "Ferroli",
    "talia",
    "Ventika",
    "hydro-s",
    "basic",
    "Techno",
    "ppa",
    "junan",
    "ferro",
    "europlast",
    "elmos",
    "computherm",
    "porto",
    "Proport",
    "dyson",
    "tip",
    "Ecoradco",
    "Eco-Rail",
    "ItalTermo",
    "rio",
    "thinkpad",
    "essential",
    "topload",
    "Deuter",
    "Aviant",
    "Duffel",
    "Pro",
    "Movo",
    "Wokin",
    "intex",
    "KARCHER",
    "electrolux",
    "bespoke",
    "Parrot AR.Drone",
    "Doodler",
    "Bresser",
    "Key",
    "jet",
    "Ring",
    "Reflecta",
    "FLEXO",
    "DeskPro",
    "Chemoform",
    "Manfrotto",
    "AEG",
    "Vivitar",
    "DJI",
    "Tello",
    "Part",
    "Flight Battery",
    "Xenox",
    "whirpool",
    "daewoo",
    "tefal",
    "Ninja",
    "optiplex",
    "omen",
    "gaming",
]

TERM_MAP = {
    # Romanian → English / Russian
    ("ro", "Husă"): {"en": "case", "ru": "чехол"},
    ("ro", "valiza"): {"ru": "чемодан"},
    ("ro", "geanta"): {"ru": "сумка"},
    ("en", "discrete"): {"ru": "дискретная"},
    ("en", "integrated"): {"ru": "интегрированная"},
    # English → Russian
    ("en", "fan"): {"ru": "вентилятор"},
    ("en", "cap"): {"ru": "заглушка"},
    ("en", "bag"): {"ru": "сумка"},
    ("ro", "Calculator"): {"en": "Computer", "ru": "Компьютер"},
    ("en", "Computer"): {"ro": "Computer"},
    # Colors - Romanian to English and Russian
}


def apply_term_map(text: str, src: str, dest: str) -> str:
    if not text:
        return text

    for (map_src, word), targets in TERM_MAP.items():
        if map_src != src:
            continue
        replacement = targets.get(dest)
        if not replacement:
            continue

        # whole-word, case-insensitive replacement
        pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
        text = pattern.sub(replacement, text)

    return text


STOP_WORDS = sorted(STOP_WORDS, key=len, reverse=True)

STOP_WORD_PATTERN = re.compile(
    r"(?<!\w)(" + "|".join(re.escape(w) for w in STOP_WORDS) + r")(?!\w)", re.IGNORECASE
)


def protect_stopwords(text: str):
    """
    Replace stop words in text with placeholders before translation.
    Uses translation-safe placeholders that LibreTranslate will not modify.
    """
    placeholders = {}
    counter = 0

    def replacer(match):
        nonlocal counter
        word = match.group(0)
        key = f"Q1BJ952a1{counter}Q1BJ952a1"  # <-- SAFE placeholder
        placeholders[key] = word
        counter += 1
        return key

    protected_text = STOP_WORD_PATTERN.sub(replacer, text)
    return protected_text, placeholders


def restore_stopwords(text: str, placeholders: dict):
    """
    Replace placeholders back with original stop words after translation.
    """
    for key, word in placeholders.items():
        text = text.replace(key, word)
    return text


def run_translation(
    shop_filter=None,
    db="default",
    force=False,
    skip_ru=False,
    product_ids=None,
    batch_idx=None,
    total_batches=None,
):
    """
    Translate a batch of products using LibreTranslate.
    Logs include db/shop and thread info.
    """

    STOP_TRANSLATION = False

    def signal_handler(sig, frame):
        nonlocal STOP_TRANSLATION
        translation_log(f"[{db}] Ctrl+C received, stopping gracefully")
        STOP_TRANSLATION = True

    signal.signal(signal.SIGINT, signal_handler)

    MAX_RETRIES = 5
    SLEEP_BETWEEN_REQUESTS = 1.0

    def normalize_text(text: str) -> str:
        return " ".join(str(text or "").strip().split())

    def translate_text(text: str, src: str, dest: str) -> str:
        if not text or not text.strip():
            return ""

        # Protect stop words
        text_to_translate, placeholders = protect_stopwords(text)

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                translation_log(
                    f"[{db}] Translating '{text[:50]}...' {src}->{dest} attempt {attempt}"
                )
                payload = {
                    "q": text_to_translate,
                    "source": src,
                    "target": dest,
                    "format": "text",
                }
                response = requests.post(LIBRETRANSLATE_URL, json=payload, timeout=30)
                response.raise_for_status()
                translated = response.json().get("translatedText", "")
                time.sleep(SLEEP_BETWEEN_REQUESTS + random.uniform(0.1, 0.5))

                # Restore stop words
                translated = restore_stopwords(translated, placeholders)
                translated = apply_term_map(translated, src, dest)

                return normalize_text(translated)

            except Exception as e:
                translation_log(f"[{db}] Translation failed: {e}, attempt={attempt}")
                time.sleep(2 * attempt)

        translation_log(
            f"[{db}] Translation skipped after {MAX_RETRIES} attempts: '{text[:50]}...'"
        )
        return text

    # =========================
    # Fetch products
    # =========================
    qs = Product.objects.using(db).filter(
        id__in=product_ids,
        # shop__iexact=shop_filter, no needed shop filter db == shop
    )

    total = qs.count()
    if total == 0:
        translation_log(f"[{db}] No products found")
        return

    def is_translated(product: Product) -> bool:
        t_name = product.t_name or {}
        t_variant = product.t_variant or {}

        # Check 'name'
        name_translated = False
        if product.name:
            name_translated = (
                bool(t_name.get("ro"))
                and bool(t_name.get("en"))
                and bool(t_name.get("ru"))
            )

        # Check 'variant'
        variant_translated = False
        if product.variant:
            variant_translated = (
                bool(t_variant.get("ro"))
                and bool(t_variant.get("en"))
                and bool(t_variant.get("ru"))
            )

        return name_translated and variant_translated

    def binary_search_start(qs):
        min_id = qs.aggregate(min_id=models.Min("id"))["min_id"]
        max_id = qs.aggregate(max_id=models.Max("id"))["max_id"]
        if not min_id or not max_id:
            return None
        while min_id < max_id:
            mid = (min_id + max_id) // 2
            mid_product = qs.filter(id=mid).first()
            if not mid_product or is_translated(mid_product):
                min_id = mid + 1
            else:
                max_id = mid
        product = qs.filter(id=min_id).first()
        return min_id if product and not is_translated(product) else None

    start_id = binary_search_start(qs)
    if start_id:
        qs = qs.filter(id__gte=start_id)
        to_translate_count = qs.count()
        translation_log(
            f"[{db}]"
            f"Batch {batch_idx}/{total_batches if total_batches else '?'} "
            f"Starting from product ID {start_id}. Products to translate in this batch: {to_translate_count}"
        )
    else:
        translation_log(f"[{db}] All products already translated")
        return

    for idx, product in enumerate(qs.order_by("id"), 1):

        if STOP_TRANSLATION:
            translation_log(f"[{db}] STOP requested at product {idx}/{qs.count()}")
            break

        if is_translated(product) and not force:
            continue

        t_name = product.t_name or {}
        t_variant = product.t_variant or {}

        # Translate name
        if product.name and (force or not t_name.get("en")):
            t_name["en"] = translate_text(product.name, "ro", "en")
        if not skip_ru and t_name.get("en"):
            t_name["ru"] = translate_text(t_name["en"], "en", "ru")
        product.t_name = t_name

        # Translate variant
        if product.variant and (force or not t_variant.get("en")):
            t_variant["en"] = translate_text(product.variant, "ro", "en")
        if not skip_ru and t_variant.get("en"):
            t_variant["ru"] = translate_text(t_variant["en"], "en", "ru")
        product.t_variant = t_variant

        # Save with retry
        MAX_DB_RETRIES = 5
        DB_RETRY_SLEEP = 60
        saved = False
        for attempt in range(MAX_DB_RETRIES):
            try:
                product.save(using=db, update_fields=["t_name", "t_variant"])
                saved = True
                break
            except OperationalError as e:
                translation_log(
                    f"[{db}] DB error on product {product.id}: {e}, retry={attempt+1}"
                )
                time.sleep(DB_RETRY_SLEEP)
        if not saved:
            translation_log(f"[{db}] FAILED to save product {product.id}")

        translation_log(f"[{db}]Translated product {product.id} ({idx}/{qs.count()})")


# =========================
# CLI ENTRYPOINT
# =========================
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run product translation")
    parser.add_argument("--db", default="default", help="Database/shop to use")
    parser.add_argument("--force", action="store_true", help="Force re-translation")
    parser.add_argument(
        "--skip-ru", action="store_true", help="Skip Russian translation"
    )
    parser.add_argument("--shop-filter", default=None, help="Filter by shop")
    parser.add_argument(
        "--product-ids", default=None, help="Comma-separated list of product IDs"
    )
    parser.add_argument(
        "--batch-idx", type=int, default=None, help="Batch index (for logging)"
    )
    parser.add_argument(
        "--total-batches", type=int, default=None, help="Total batches (for logging)"
    )

    args = parser.parse_args()

    translation_log(
        f"[{args.db}] Starting LibreTranslate translation: db={args.db}, shop={args.shop_filter}"
    )

    run_translation(
        db=args.db,
        force=args.force,
        skip_ru=args.skip_ru,
        # shop_filter=args.shop_filter,
        product_ids=(
            [int(x) for x in args.product_ids.split(",") if x.strip()]
            if args.product_ids
            else None
        ),
        batch_idx=args.batch_idx,
        total_batches=args.total_batches,
    )
