from django.core.management.base import BaseCommand
from django.db import OperationalError
from products.models import Product
from products.utils.log.translation_log import translation_log
import re

# =========================
# ASSOCIATION MAPS
# =========================

ASSOC_T_NAME_POST = {
    "ro": {
        "Calculator": "Computer",
    },
    "ru": {
        "Яблоко айфон": "Apple Iphone",
        "Самсунг": "Samsung",
        "Галакси": "Галактика",
        "Реалме": "RealMe",
        "Nord": "Север",
        "Поко": "Poco",
        "Асус": "Asus",
        "Логитек": "Logitech",
        "Свен": "Sven",
        "Макбук": "MacBook",
        "Навигатор": "Navigator",
        "Улефон": "Ulefon",
        "Броня": "Armor",
        "Нокиа": "Nokia",
        "Оппо Рено": "Oppo Reno",
        "Виво": "Vivo",
        "Яблоко Айфон": "Apple iPhone",
        "Хонор": "Honor",
        "Хуавей": "Huawei",
        "Сеяоми": "Xiaomi",
        "Cяоми": "Xiaomi",
        "Сяоми": "Xiaomi",
        "Яблоко Айфон": "Apple iPhone",
        "Гугл": "Google",
        "Ничего": "Nothing",
        "Нубиа": "Nubia",
        "Микротик": "Mikrotik",
        "Микрофонный": "Микрофон",
        "Ауратон": "Auraton",
        "Моторола": "Motorola",
        "Техно": "Techno",
        "Стандартный": "Standard",
        "ЭРА": "ERA",
        "Майкаи": "Maika'i",
        "Горгиэль": "Gorgiel",
        "Феррумная": "Ferrum",
        "Феррум": "Ferrum",
        "Зилмет": "Zilmet",
        "ДемирДокум": "DemirDokum",
        "Элмос": "Elmos",
        "Даддарио": "D'Addario",
        "Струна": "Струны",
        "Гора": "Hora",
        "Музыкальный Плеер": "Гармоника",
        "music player": "harmonic",
        "гравитация": "Gravity",
        "Гравитация": "Gravity",
        "Обсуждение": "",
        "Сименс": "Siemens",
        "Тамбурский": "Тамбурин",
        "попугай": "Parrot",
        "Новация": "Novation",
        "Статуя": "Штатив",
        "Статический": "Штатив",
        "отбора проб": "сэмплинга",
        "Жемчужная": "Pearl",
        "Тысячелетие": "Millenium",
        "Карл Хоффмайстер": "Karl Hoffmeister",
        "Статистика": "Штатив",
        "Support": "Держатель",
        "Пламенная": "Flame",
        "Конс музыка": "Cons Music",
        "Конс": "Cons",
        "Ортега": "Ortega",
        "Пирамидальная": "Pyramid",
        "Энсто": "Ensto",
        "Эликсир": "Elixir",
        "Hose": "Case",
        "Скриншоты из Hose": "Чехол",
        "Босс": "Boss",
        "Скачать": "",
        "Путешествие": "Journey",
        "Cельдь": "Древестный",
        "Новая клавиатура MIDI": "MIDI-клавиатура Novation",
        "Классическое гитарное": "Классическая Гитара",
        "Харли Бентон": "Harley Benton",
        "Стрингс": "Струны",
        "Пламя Хосе": "Чехол Hose Flame",
        "пламя": "Flame",
        "Pedal": "Педаль",
        "Обсуждения": "Squier",
        "" "Вандорена Жава Красный вырезал": "Vandoren Java Red Cut",
        "Якоря": "Трость",
        "Браун": "Коричневый",
        "Пламя": "Flame",
        "Поддержка": "Держатель",
        "Сфера роктила": "Rocktile Sphere",
        "ГЕВА": "GEWA",
        "Майн": "Meinl",
        "Педальный Патрон": "Педаль Boss",
        "Ария": "Aria",
        "попугая": "Parrot",
        "фанат": "вентилятор",
        "Королевское": "Royal Thermo",
        "Коллекционер собрал": "Коллектор в сборе",
        "Перфетто": "Perfetto",
        "Орно Орно": "ORNO ORNO",
        "Belt": "Ремешок",
        "Туле": "THULE",
        "Выхлопные газы": "Вентилятор",
        "Подземная дорожная сумка": "Сумка для путешествий",
        "Рексант": "Rexant",
        "Моджо": "Mojo",
        "Барабанное наращивание": "Удлинитель Барабана",
        "Проездной пакет": "Проездная сумка",
        "Золотое колесо": "Golden Wheel",
        "Велосипедист": "Велосипедные защитники",
        "Corzi": "Струны",
        "Случай": "Чемодан",
        "Дади струнный": "Dadi струна",
        "Доказать силикон": "Proove Silicone",
        "Босс": "Boss",
        "Геркулес": "Hercules",
        "Миллениум": "Millenium",
        "СанТехРай": "SanTehRay",
        "на всю жизнь": "Lifetime",
        "Мейнл": "Meinl",
        "Ария": "Aria",
        "Хуса": "Чехол",
        "Эликсир": "Elixir",
        "Харли Бентон": "Harley Benton",
        "House": "Чехол",
        "__STOPWORD_0__": "",
        "Хоуса": "Чехол",
        "Вандорена ЖАВА КРАСНАЯ СНИМАЕТ": "Vandoren JAVA RED CUT",
        "Хауса": "Чехол",
        "Куртка": "Чехол",
        "Барабанное наращивание": "Удлинитель Барабанов",
        "Ибанез": "Ibanez",
        "Эликсирные": "Elixir",
        "Полотенце сухая": "Полотенцешушитель",
        "Белтехком": "Beltehkom",
        "Ферроли Талия": "Ferroli Talia",
        "Замораживающий": "Антифризный",
        "Аэротерм": "Aeroterm",
        "Американский турист-мореискатель": "American Tourister Sea Seeker",
        "Телевизионная поддержка": "Кронштейн ТВ",
        "крышка": "чехол",
        "Дело": "Чемодан",
        "Случай": "Чемодан",
        "Вентиляционные": "Вентиляция",
        "Рексантный": "Rexant",
        "олды Кит Easy Home ГИГРО КОМПАКТ": "Aldes Kit EasyHOME HYGRO COMPACT",
        "Завод": "Котел",
        "Королевский Thermo Biliner 500": "Секционный радиатор Royal Thermo BiLiner 500",
        "шлем": "Helmet",
        "__ Стопворд _ 0 _ FON _ _ Стопворд _ 1 __ve Запись Свет _ _ Стопворд _ 2 _ ing": "Микрофон Proove Record Lightning",
    },
    "en": {
        "Housa": "Case",
        "jacket": "Case",
        "Royal Thermo Biliner 500": "Royal Thermo BiLiner 500 sectional radiator",
        "Freezing": "Anti Freezing",
        "gas plant": "gas boiler",
        "Corzi": "Strings",
        "_ _ STOPWORD _ 0 _ _ FON _ _ STOPWORD _ 1 _ _ ove Record Light _ _ STOPWORD _ 2 _ _ ing": "Microphone Proove Record Lightning",
    },
}

ASSOC_T_VARIANT_POST = {
    "ru": {
        "Blue Dusk": "Синие сумерки",
        "Blue Void": "Синяя Пустота",
        "Blue Ocean": "Синий Океан",
        "Gold Cocoa": "Золотой какао",
        "Starlight": "Звездный Свет",
        "Ядро": "Core",
    }
}

# =========================
# UTILS
# =========================


def replace_substrings(text, mapping):
    """Replace multiple substrings in text using mapping (case-sensitive)."""
    if not isinstance(text, str):
        return text
    new_text = text
    for src, dst in mapping.items():
        if src in new_text:
            new_text = new_text.replace(src, dst)
    return new_text


# =========================
# COMMAND
# =========================


class Command(BaseCommand):
    help = "Apply post-translation association mappings to t_name and t_variant"

    BATCH_SIZE = 1000

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database alias (default: default)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Do not save changes, only log what would be changed",
        )

    def handle(self, *args, **options):
        db = options["db"]
        dry_run = options["dry_run"]

        qs = Product.objects.using(db).all()
        total = qs.count()

        translation_log(
            f"[MAP] Starting mapping on DB='{db}' | products={total} | dry_run={dry_run}"
        )

        updated = 0
        checked = 0

        for product in qs.iterator(chunk_size=self.BATCH_SIZE):
            checked += 1
            changed = False

            t_name = product.t_name or {}
            t_variant = product.t_variant or {}

            # -------- t_name --------
            for lang, mapping in ASSOC_T_NAME_POST.items():
                old_val = t_name.get(lang)
                new_val = replace_substrings(old_val, mapping)
                if new_val != old_val:
                    translation_log(
                        f"[MAP][NAME] product={product.id} lang={lang} "
                        f"'{old_val}' → '{new_val}'"
                    )
                    t_name[lang] = new_val
                    changed = True

            # -------- t_variant --------
            for lang, mapping in ASSOC_T_VARIANT_POST.items():
                old_val = t_variant.get(lang)
                new_val = replace_substrings(old_val, mapping)
                if new_val != old_val:
                    translation_log(
                        f"[MAP][VARIANT] product={product.id} lang={lang} "
                        f"'{old_val}' → '{new_val}'"
                    )
                    t_variant[lang] = new_val
                    changed = True

            if not changed:
                continue

            updated += 1

            if dry_run:
                continue

            # Save safely
            try:
                product.t_name = t_name
                product.t_variant = t_variant
                product.save(
                    using=db,
                    update_fields=["t_name", "t_variant"],
                )
            except OperationalError as e:
                translation_log(f"[MAP][ERROR] product={product.id} db error: {e}")

        translation_log(
            f"[MAP] Completed DB='{db}' | checked={checked} | updated={updated}"
        )
