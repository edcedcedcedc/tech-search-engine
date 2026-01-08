from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import CategoryMapping, Product
from server.products.utils.category_unifier_log import category_log


# Update Darwin in default DB
# python manage.py update_categories_per_shop --shop Darwin

# Update Enter in default DB
# python manage.py update_categories_per_shop --shop Enter

# Update XStore in a specific DB (e.g., xtore)
# python manage.py update_categories_per_shop --shop XStore --source xtore

# ---- Unified category mapping ----
CATEGORY_MAPPING = {
    # =====================
    # TELEFOANE
    # =====================
    "Darwin|Telefoane DECT": "telefon fix, dect, birou",
    "Enter|Стационарные телефоны": "telefon fix, dect, birou",
    "Darwin|Telefoane mobile cu buton": "telefon mobil, buton, feature phone",
    "Enter|Кнопочные мобильные телефоны": "telefon mobil, buton, feature phone",
    "Darwin|Smartphone": "smartphone, telefon mobil",
    "Enter|Смартфоны": "smartphone, telefon mobil",
    # =====================
    # STOCARE
    # =====================
    "Darwin|Hard Disk (HDD)": "stocare interna, hdd, componente pc",
    "Enter|HDD": "stocare interna, hdd, componente pc",
    "Darwin|Hard Disk (HDD) externe": "stocare externa, hdd, accesorii pc",
    "Darwin|Solid-State Drive (SSD)": "stocare interna, ssd, componente pc",
    "Enter|SSD": "stocare interna, ssd, componente pc",
    # =====================
    # COMPONENTE PC
    # =====================
    "Darwin|Procesoare": "procesor, cpu, componente pc",
    "Enter|Процессоры ПК": "procesor, cpu, componente pc",
    "Darwin|Memorie RAM": "memorie ram, componente pc",
    "Enter|Оперативная память": "memorie ram, componente pc",
    "Darwin|Plăci de bază": "placa de baza, motherboard, componente pc",
    "Enter|Материнские платы": "placa de baza, motherboard, componente pc",
    "Darwin|Placi video": "placa video, gpu, componente pc",
    "Enter|Видеокарты": "placa video, gpu, componente pc",
    "Darwin|Surse PC": "sursa pc, psu, componente pc",
    "Enter|Блоки питания": "sursa pc, psu, componente pc",
    "Darwin|Coolere": "racire pc, cooler, componente pc",
    "Enter|Кулеры и Вентиляторы для ПК": "racire pc, cooler, componente pc",
    "Darwin|Accesorii coolere": "racire pc, accesorii",
    "Enter|Корпусы ПК": "carcasa pc, componente pc",
    # =====================
    # PC-uri & LAPTOP-uri
    # =====================
    "Darwin|Laptop-uri": "laptop, notebook",
    "Enter|Ноутбуки": "laptop, notebook",
    "Darwin|Laptopuri gaming": "laptop gaming, notebook gaming",
    "Enter|Игровые ноутбуки": "laptop gaming, notebook gaming",
    "Darwin|Sisteme PC": "pc desktop, sistem complet",
    "Enter|Системные блоки": "pc desktop, sistem complet",
    "Darwin|Sisteme PC Gaming": "pc gaming, desktop gaming",
    "Enter|Игровые системные блоки": "pc gaming, desktop gaming",
    "Darwin|All in One PC": "pc all in one, desktop",
    "Enter|Моноблоки": "pc all in one, desktop",
    # =====================
    # MONITOARE
    # =====================
    "Darwin|Monitoare": "monitor, display",
    "Enter|Мониторы": "monitor, display",
    "Darwin|Monitoare gaming": "monitor gaming, display",
    "Enter|monitor gaming": "monitor gaming, display",
    "Darwin|Suporturi pentru monitoare": "suport monitor, accesorii birou",
    "Enter|Кронштейны для мониторов": "suport monitor, accesorii birou",
    # =====================
    # PERIFERICE
    # =====================
    "Darwin|Tastaturi": "tastatura, periferice pc",
    "Darwin|Tastaturi gaming": "tastatura gaming, periferice pc",
    "Enter|Игровые клавиатуры": "tastatura gaming, periferice pc",
    "Darwin|Mouse-uri": "mouse, periferice pc",
    "Darwin|Mouse-uri gaming": "mouse gaming, periferice pc",
    "Enter|Игровые мышки": "mouse gaming, periferice pc",
    "Darwin|Mouse pad-uri": "mouse pad, accesorii pc",
    "Darwin|Mouse pad-uri gaming": "mouse pad gaming, accesorii pc",
    "Enter|Коврики для мышки": "mouse pad, accesorii pc",
    "Enter|Коврики для игровых мышек": "mouse pad gaming, accesorii pc",
    # =====================
    # AUDIO
    # =====================
    "Darwin|Căști gaming": "casti gaming, audio",
    "Enter|Игровые наушники": "casti gaming, audio",
    "Darwin|Microfoane gaming": "microfon gaming, audio",
    "Enter|Игровые микрофоны": "microfon gaming, audio",
    # =====================
    # CONSOLE & JOCURI
    # =====================
    "Darwin|Console": "console jocuri",
    "Enter|Игровые консоли": "console jocuri",
    "Darwin|Jocuri": "jocuri video",
    "Enter|Игры для консолей": "jocuri video",
    "Darwin|Controllere": "controller jocuri, accesorii gaming",
    "Enter|Контроллеры для ПК": "controller jocuri, accesorii gaming",
    # =====================
    # MOBILIER & BIROU
    # =====================
    "Darwin|Scaune Gaming": "scaun gaming, mobilier birou",
    "Enter|Игровые кресла": "scaun gaming, mobilier birou",
    "Darwin|Mese pentru calculator": "birou calculator, mobilier",
    "Enter|Компьютерные столы": "birou calculator, mobilier",
    "Darwin|Lămpi": "lampa birou, iluminat",
    "Enter|Лампы": "lampa birou, iluminat",
    # =====================
    # ACCESORII & MISC
    # =====================
    "Darwin|Sticle și folii de protecție": "protectie telefon, accesorii mobile",
    "Darwin|Suporturi auto": "suport auto telefon, accesorii auto",
    "Enter|Автомобильные держатели": "suport auto telefon, accesorii auto",
    "Darwin|Căni": "cană, accesorii birou",
    "Enter|Кружки": "cană, accesorii birou",
    "Darwin|Sticle de apă": "sticlă apă, accesorii birou",
    "Darwin|Articole Fan": "merchandising, fan gear",
    "Enter|Сувениры и атрибутика из игр": "merchandising, fan gear",
}


class Command(BaseCommand):
    help = "Update unified categories for a specific shop"

    def add_arguments(self, parser):
        parser.add_argument(
            "--shop",
            type=str,
            help="Shop name to update categories for (Darwin, Enter, XStore, etc.)",
            required=True,
        )

    def handle(self, *args, **options):
        shop_name = options["shop"]
        category_log(f"START category update for shop='{shop_name}'")

        # Step 1: Update CategoryMapping table
        updated_mappings = 0
        for key, unified in CATEGORY_MAPPING.items():
            shop, raw_category = key.split("|")
            if shop != shop_name:
                continue

            obj, created = CategoryMapping.objects.get_or_create(
                shop=shop,
                raw_category=raw_category,
                defaults={"unified_category": unified},
            )

            if not created and obj.unified_category != unified:
                obj.unified_category = unified
                obj.save()
                updated_mappings += 1

            msg = f"[MAPPING] {shop} | {raw_category} → {unified}"
            category_log(msg)

        category_log(f"CategoryMapping updated/created: {updated_mappings}")

        # Step 2: Update Products table for this shop
        category_log(f"🔹 Updating products for shop='{shop_name}'")
        updated_products = 0

        with transaction.atomic():
            mappings = CategoryMapping.objects.filter(shop=shop_name)
            for mapping in mappings:
                qs = Product.objects.filter(
                    shop=mapping.shop, category=mapping.raw_category
                ).exclude(category=mapping.unified_category)

                count = qs.update(category=mapping.unified_category)
                updated_products += count
                msg = f"[PRODUCTS] {mapping.shop} | '{mapping.raw_category}' → '{mapping.unified_category}' ({count})"
                if count:
                    category_log(msg)

        category_log(
            f"END category update for shop='{shop_name}' | products updated={updated_products}"
        )
