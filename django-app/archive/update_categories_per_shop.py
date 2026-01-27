from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import CategoryMapping, Product
from server.products.utils.db_copy import category_log


# Update Darwin in default DB
# python manage.py update_categories_per_shop --shop Darwin

# Update Enter in default DB
# python manage.py update_categories_per_shop --shop Enter

# Update XStore in a specific DB (e.g., xtore)
# python manage.py update_categories_per_shop --shop XStore --source xtore


""" 
monitor gaming, display
laptop, notebook
laptop gaming, notebook gaming
stocare interna, hdd, componente pc
stocare interna, ssd, componente pc
sursa pc, psu, componente pc
memorie ram, componente pc
procesor, cpu, componente pc
carcasa pc, componente pc
placa video, gpu, componente pc
placa de baza, motherboard, componente pc
smartphone, telefon mobil
mouse gaming, periferice pc
console jocuri
tastatura gaming, periferice pc
controller jocuri, accesorii gaming
casti gaming, audio
telefon mobil, buton, feature phone
telefon fix, dect, birou
pc desktop, sistem complet
monitor, display
racire pc, cooler, componente pc
suport monitor, accesorii birou
pc all in one, desktop
pc gaming, desktop gaming
Игровые мониторы or Игровые Мониторы
jocuri video
mouse pad gaming, accesorii pc
mouse pad, accesorii pc
scaun gaming, mobilier birou
microfon gaming, audio
birou calculator, mobilier
cană, accesorii birou
merchandising, fan gear
suport auto telefon, accesorii auto
lampa birou, iluminat
protectie telefon, accesorii mobile
tastatura, periferice pc
mouse, periferice pc
stocare externa, hdd, accesorii pc
racire pc, accesorii
sticlă apă, accesorii birou
laptop accessories
software
casti, audio
incarcatoare, accesorii mobile
camera actiune
docking station, accesorii pc
cabluri, accesorii
power bank, accesorii mobile
protectie retea, birou
accesorii tableta
stocare interna, ssd, hdd, componente pc
accesorii gaming
tableta
accesorii apple
pc desktop, apple
mini pc, apple
media player
pc all in one, apple
smartwatch
mini pc, desktop
tableta grafica, periferice pc
periferice pc
microfon, audio
birou, mobilier
camera web, periferice pc
scaun birou, mobilier
televizor
suport tv, accesorii tv
accesorii tv
imprimanta, birou
consumabile imprimanta
scanner, birou
shredder, birou
proiectoare, display
ecrane proiectie
aspirator robot
merchandising, gaming


 """


# ---- Unified category mapping ----
CATEGORY_MAPPING = {
    # =====================
    # TELEFOANE
    # =====================
    "darwin|Telefoane DECT": "telefon fix, dect, birou",
    "enter|Стационарные телефоны": "telefon fix, dect, birou",
    "darwin|Telefoane mobile cu buton": "telefon mobil, buton, feature phone",
    "enter|Кнопочные мобильные телефоны": "telefon mobil, buton, feature phone",
    "darwin|Smartphone": "smartphone, telefon mobil",
    "enter|Смартфоны": "smartphone, telefon mobil",
    # =====================
    # STOCARE
    # =====================
    "darwin|Hard Disk (HDD)": "stocare interna, hdd, componente pc",
    "enter|HDD": "stocare interna, hdd, componente pc",
    "darwin|Hard Disk (HDD) externe": "stocare externa, hdd, accesorii pc",
    "darwin|Solid-State Drive (SSD)": "stocare interna, ssd, componente pc",
    "enter|SSD": "stocare interna, ssd, componente pc",
    # =====================
    # COMPONENTE PC
    # =====================
    "darwin|Procesoare": "procesor, cpu, componente pc",
    "enter|Процессоры ПК": "procesor, cpu, componente pc",
    "darwin|Memorie RAM": "memorie ram, componente pc",
    "enter|Оперативная память": "memorie ram, componente pc",
    "darwin|Plăci de bază": "placa de baza, motherboard, componente pc",
    "enter|Материнские платы": "placa de baza, motherboard, componente pc",
    "darwin|Placi video": "placa video, gpu, componente pc",
    "enter|Видеокарты": "placa video, gpu, componente pc",
    "darwin|Surse PC": "sursa pc, psu, componente pc",
    "enter|Блоки питания": "sursa pc, psu, componente pc",
    "darwin|Coolere": "racire pc, cooler, componente pc",
    "enter|Кулеры и Вентиляторы для ПК": "racire pc, cooler, componente pc",
    "darwin|Accesorii coolere": "racire pc, accesorii",
    "enter|Корпусы ПК": "carcasa pc, componente pc",
    # =====================
    # PC-uri & LAPTOP-uri
    # =====================
    "darwin|Laptop-uri": "laptop, notebook",
    "enter|Ноутбуки": "laptop, notebook",
    "darwin|Laptopuri gaming": "laptop gaming, notebook gaming",
    "enter|Игровые ноутбуки": "laptop gaming, notebook gaming",
    "darwin|Sisteme PC": "pc desktop, sistem complet",
    "enter|Системные блоки": "pc desktop, sistem complet",
    "darwin|Sisteme PC Gaming": "pc gaming, desktop gaming",
    "enter|Игровые системные блоки": "pc gaming, desktop gaming",
    "darwin|All in One PC": "pc all in one, desktop",
    "enter|Моноблоки": "pc all in one, desktop",
    # =====================
    # MONITOARE
    # =====================
    "darwin|Monitoare": "monitor, display",
    "enter|Мониторы": "monitor, display",
    "enter|Игровые Мониторы": "monitor gaming, display",
    "darwin|Monitoare gaming": "monitor gaming, display",
    "enter|monitor gaming": "monitor gaming, display",
    "darwin|Suporturi pentru monitoare": "suport monitor, accesorii birou",
    "enter|Кронштейны для мониторов": "suport monitor, accesorii birou",
    # =====================
    # PERIFERICE
    # =====================
    "darwin|Tastaturi": "tastatura, periferice pc",
    "darwin|Tastaturi gaming": "tastatura gaming, periferice pc",
    "enter|Игровые клавиатуры": "tastatura gaming, periferice pc",
    "enter|Клавиатуры": "tastatura, periferice pc",
    "enter|Устройства хранения данных": "stocare, pc",
    "darwin|Mouse-uri": "mouse, periferice pc",
    "darwin|Mouse-uri gaming": "mouse gaming, periferice pc",
    "enter|Игровые мышки": "mouse gaming, periferice pc",
    "darwin|Mouse pad-uri": "mouse pad, accesorii pc",
    "darwin|Mouse pad-uri gaming": "mouse pad gaming, accesorii pc",
    "enter|Коврики для мышки": "mouse pad, accesorii pc",
    "enter|Коврики для игровых мышек": "mouse pad gaming, accesorii pc",
    # =====================
    # AUDIO
    # =====================
    "darwin|Căști gaming": "casti gaming, audio",
    "enter|Игровые наушники": "casti gaming, audio",
    "darwin|Microfoane gaming": "microfon gaming, audio",
    "enter|Игровые микрофоны": "microfon gaming, audio",
    # =====================
    # CONSOLE & JOCURI
    # =====================
    "darwin|Console": "console jocuri",
    "enter|Игровые консоли": "console jocuri",
    "darwin|Jocuri": "jocuri video",
    "enter|Игры для консолей": "jocuri video",
    "darwin|Controllere": "controller jocuri, accesorii gaming",
    "enter|Контроллеры для ПК": "controller jocuri, accesorii gaming",
    # =====================
    # MOBILIER & BIROU
    # =====================
    "darwin|Scaune Gaming": "scaun gaming, mobilier birou",
    "enter|Игровые кресла": "scaun gaming, mobilier birou",
    "darwin|Mese pentru calculator": "birou calculator, mobilier",
    "enter|Компьютерные столы": "birou calculator, mobilier",
    "darwin|Lămpi": "lampa birou, iluminat",
    "enter|Лампы": "lampa birou, iluminat",
    # =====================
    # ACCESORII & MISC
    # =====================
    "darwin|Sticle și folii de protecție": "protectie telefon, accesorii mobile",
    "darwin|Suporturi auto": "suport auto telefon, accesorii auto",
    "enter|Автомобильные держатели": "suport auto telefon, accesorii auto",
    "darwin|Căni": "cană, accesorii birou",
    "enter|Кружки": "cană, accesorii birou",
    "darwin|Sticle de apă": "sticlă apă, accesorii birou",
    "darwin|Articole Fan": "merchandising, fan gear",
    "enter|Сувениры и атрибутика из игр": "merchandising, fan gear",
    # ======================
    # XSTORE
    # ======================
    "xstore|Smartphone": "smartphone, telefon mobil",
    "xstore|Apple iPhone": "smartphone, telefon mobil",
    "xstore|Huse telefon": "protectie telefon, accesorii mobile",
    "xstore|Protectie ecran telefon": "protectie telefon, accesorii mobile",
    "xstore|Power Bank": "power bank, accesorii mobile",
    "xstore|Laptopuri": "laptop, notebook",
    "xstore|Laptopuri gaming": "laptop gaming, notebook gaming",
    "xstore|Apple MacBook": "laptop, notebook",
    "xstore|Calculatoare PC": "pc desktop, sistem complet",
    "xstore|Calculatoare Gaming": "pc gaming, desktop gaming",
    "xstore|All-in-One PC": "pc all in one, desktop",
    "xstore|Mini PC": "mini pc, desktop",
    "xstore|Procesoare": "procesor, cpu, componente pc",
    "xstore|Plăci de bază": "placa de baza, motherboard, componente pc",
    "xstore|Plăci video": "placa video, gpu, componente pc",
    "xstore|Memorii RAM": "memorie ram, componente pc",
    "xstore|Unități de stocare date": "stocare interna, ssd, hdd, componente pc",
    "xstore|Surse": "sursa pc, psu, componente pc",
    "xstore|Carcase": "carcasa pc, componente pc",
    "xstore|Sisteme de racire": "racire pc, cooler, componente pc",
    "xstore|Monitoare": "monitor, display",
    "xstore|Suport monitor": "suport monitor, accesorii birou",
    "xstore|Mouse": "mouse, periferice pc",
    "xstore|Tastaturi": "tastatura, periferice pc",
    "xstore|Mouse pad-uri": "mouse pad, accesorii pc",
    "xstore|Camere Web": "camera web, periferice pc",
    "xstore|Căști": "casti, audio",
    "xstore|Microfoane": "microfon, audio",
    "xstore|Televizoare": "televizor",
    "xstore|Suport TV": "suport tv, accesorii tv",
    "xstore|Console gaming": "console jocuri",
    "xstore|Sony PlayStation 5": "console jocuri",
    "xstore|Nintendo Switch": "console jocuri",
    "xstore|Imprimante": "imprimanta, birou",
    "xstore|Scanere": "scanner, birou",
    "xstore|Cartușe": "consumabile imprimanta",
    "xstore|Tonere": "consumabile imprimanta",
    "xstore|Tablete": "tableta",
    "xstore|Apple iPad": "tableta",
    "xstore|Apple Watch": "smartwatch",
}


class Command(BaseCommand):
    help = "Blindly normalize product categories (no shop logic)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db", default="default", help="Database to run against (default or stage)"
        )

    def handle(self, *args, **options):
        db = options["db"]

        self.stdout.write(
            self.style.WARNING(f"Running BLIND category normalization on db='{db}'")
        )

        total_updated = 0

        with transaction.atomic(using=db):
            for raw_category, unified_category in BLIND_CATEGORY_MAPPING.items():
                updated = (
                    Product.objects.using(db)
                    .filter(category=raw_category)
                    .update(category=unified_category)
                )

                total_updated += updated

                if updated:
                    category_log(
                        f"[BLIND] '{raw_category}' → '{unified_category}' ({updated})"
                    )

        self.stdout.write(
            self.style.SUCCESS(f"Done. Total products updated: {total_updated}")
        )
