from django.db.models import Q
from products.models import Product  # absolute import works in Django shell

TECH_BRANDS = [
    "Lenovo",
    "Dell",
    "HP",
    "Asus",
    "Acer",
    "Samsung",
    "LG",
    "BenQ",
    "MSI",
    "Apple",
    "Gigabyte",
    "Razer",
    "Sony",
    "ViewSonic",
    "Philips",
    "Alienware",
    "Corsair",
    "Logitech",
    "Microsoft",
    "Huawei",
    "Xiaomi",
    "TP-Link",
    "Asrock",
    "Zotac",
    "HyperX",
    "Kingston",
    "Seagate",
    "Western Digital",
    "Crucial",
    "ADATA",
    "Panasonic",
    "Sharp",
    "Toshiba",
    "Realme",
    "OnePlus",
    "Google",
    "Amazon",
    "Nintendo",
    "Epson",
    "Canon",
]


def fix_missing_brands():
    """
    Updates all products with missing or NO_BRAND brand fields.
    It scans the product name and tries to match a known TECH_BRAND.
    """
    # Filter products with missing, empty, or NO_BRAND
    products = Product.objects.filter(
        Q(brand__isnull=True) | Q(brand="") | Q(brand="NO_BRAND")
    )
    count = 0

    for p in products:
        for brand in TECH_BRANDS:
            if brand.lower() in p.name.lower():
                p.brand = brand
                p.save(update_fields=["brand"])
                count += 1
                break  # stop after first match

    print(f"Updated {count} products with missing brands")
