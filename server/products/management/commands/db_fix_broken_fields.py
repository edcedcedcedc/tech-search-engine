from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product
import json
import re


""" 
# Fix Apple products + "эир/эйр" and "рог"
python manage.py fix_bad_russian_translations --db=stage --fix-all-tech

# Also fix categories
python manage.py fix_bad_russian_translations --db=stage --fix-all-tech --fix-category

# Fix categories based on Romanian mapping
python manage.py fix_bad_russian_translations --db=stage --fix-category-mapping

# Dry run to see what would be fixed
python manage.py fix_bad_russian_translations --db=stage --fix-all-tech --dry-run
 """


class Command(BaseCommand):
    help = "Fix bad Russian translations: 'Яблоко айфон' → 'Apple iPhone' and fix MacBook translations"

    def add_arguments(self, parser):
        parser.add_argument("--db", default="stage", help="Database to update")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without updating",
        )
        parser.add_argument(
            "--fix-category",
            action="store_true",
            help="Also fix bad category translations",
        )
        parser.add_argument(
            "--fix-all-tech",
            action="store_true",
            help="Fix all common tech term mistranslations",
        )
        parser.add_argument(
            "--fix-brands",
            action="store_true",
            help="Fix brand name translations (Xiaomi, Samsung, Huawei, etc.)",
        )
        parser.add_argument(
            "--fix-category-mapping",
            action="store_true",
            help="Fix category translations based on Romanian category mapping",
        )

    def handle(self, *args, **options):
        db = options["db"]
        dry_run = options["dry_run"]
        fix_category = options["fix_category"]
        fix_all_tech = options["fix_all_tech"]
        fix_brands = options["fix_brands"]
        fix_category_mapping = options["fix_category_mapping"]

        # Get all products with bad Russian translations
        products = Product.objects.using(db).all()

        total_fixed_name = 0
        total_fixed_category = 0
        total_fixed_variant = 0
        total_fixed_brands = 0
        total_fixed_category_mapping = 0

        self.stdout.write(f"Scanning products in database: {db}")
        self.stdout.write("=" * 60)

        for product in products:
            updated = False

            # Fix t_name['ru']
            if product.t_name and isinstance(product.t_name, dict):
                ru_name = product.t_name.get("ru", "")
                if ru_name:
                    # Check if we need to fix "Чехол" to "Кейс" based on t_category['ro']
                    if product.t_category and isinstance(product.t_category, dict):
                        ro_category = product.t_category.get("ro", "")
                        # If Romanian category contains "carcasa pc" and Russian name contains "чехол"
                        if ro_category and (
                            "carcasa pc" in ro_category.lower()
                            or "carcasa, componente pc" in ro_category.lower()
                        ):
                            if "чехол" in ru_name.lower() or "Чехол" in ru_name:
                                # Replace Чехол with Кейс
                                fixed_name = re.sub(
                                    r"Чехол", "Кейс", ru_name, flags=re.IGNORECASE
                                )
                                if fixed_name != ru_name:
                                    if not dry_run:
                                        product.t_name["ru"] = fixed_name
                                        updated = True
                                    total_fixed_name += 1
                                    self.stdout.write(f"Product {product.id}:")
                                    self.stdout.write(
                                        f"  t_name.ru: '{ru_name}' → '{fixed_name}'"
                                    )
                                    self.stdout.write(
                                        f"  Reason: t_category.ro contains 'carcasa pc'"
                                    )
                                    # Skip other fixes for this product
                                    ru_name = fixed_name

                    # Apply other fixes if name was changed or if no чехол fix was applied
                    fixed_name = self.fix_apple_russian(ru_name)
                    if fix_all_tech or fix_brands:
                        fixed_name = self.fix_all_tech_terms(fixed_name)
                    if fix_brands:
                        fixed_name = self.fix_brand_translations(fixed_name)
                    if fixed_name != ru_name:
                        if not dry_run:
                            product.t_name["ru"] = fixed_name
                            updated = True
                        total_fixed_name += 1
                        self.stdout.write(f"Product {product.id}:")
                        self.stdout.write(f"  t_name.ru: '{ru_name}' → '{fixed_name}'")

            # Fix t_variant['ru'] if fix_all_tech is enabled
            if (
                fix_all_tech
                and product.t_variant
                and isinstance(product.t_variant, dict)
            ):
                ru_variant = product.t_variant.get("ru", "")
                if ru_variant:
                    fixed_variant = self.fix_variant_russian(ru_variant)
                    if fixed_variant != ru_variant:
                        if not dry_run:
                            product.t_variant["ru"] = fixed_variant
                            updated = True
                        total_fixed_variant += 1
                        self.stdout.write(
                            f"  t_variant.ru: '{ru_variant}' → '{fixed_variant}'"
                        )

            # Fix t_category['ru'] if requested
            if (
                fix_category
                and product.t_category
                and isinstance(product.t_category, dict)
            ):
                ru_category = product.t_category.get("ru", "")
                if ru_category:
                    fixed_category = self.fix_category_russian(
                        ru_category, product.t_name
                    )
                    if fix_all_tech or fix_brands:
                        fixed_category = self.fix_all_tech_terms(fixed_category)
                    if fix_brands:
                        fixed_category = self.fix_brand_translations(fixed_category)
                    if fixed_category != ru_category:
                        if not dry_run:
                            product.t_category["ru"] = fixed_category
                            updated = True
                        total_fixed_category += 1
                        self.stdout.write(
                            f"  t_category.ru: '{ru_category}' → '{fixed_category}'"
                        )

            # Fix category mapping if requested
            if (
                fix_category_mapping
                and product.t_category
                and isinstance(product.t_category, dict)
            ):
                ru_category = product.t_category.get("ru", "")
                ro_category = product.t_category.get("ro", "")
                if ru_category and ro_category:
                    fixed_category = self.fix_category_based_on_ro_mapping(
                        ru_category, ro_category
                    )
                    if fixed_category != ru_category:
                        if not dry_run:
                            product.t_category["ru"] = fixed_category
                            updated = True
                        total_fixed_category_mapping += 1
                        self.stdout.write(f"Product {product.id}:")
                        self.stdout.write(
                            f"  t_category.ru: '{ru_category}' → '{fixed_category}'"
                        )
                        self.stdout.write(f"  t_category.ro: '{ro_category}'")

            # Save if changes were made
            if updated and not dry_run:
                update_fields = ["t_name"]
                if fix_all_tech:
                    update_fields.append("t_variant")
                if fix_category or fix_all_tech or fix_brands or fix_category_mapping:
                    update_fields.append("t_category")
                product.save(update_fields=update_fields)

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("SUMMARY:")
        self.stdout.write(
            f"Products found with bad 'Яблоко айфон' in t_name.ru: {total_fixed_name}"
        )

        if fix_all_tech:
            self.stdout.write(
                f"Products with fixed variant translations: {total_fixed_variant}"
            )

        if fix_category:
            self.stdout.write(
                f"Products found with bad category in t_category.ru: {total_fixed_category}"
            )

        if fix_brands:
            self.stdout.write(
                f"Products with fixed brand translations: {total_fixed_brands}"
            )

        if fix_category_mapping:
            self.stdout.write(
                f"Products with fixed category mapping: {total_fixed_category_mapping}"
            )

        if dry_run:
            self.stdout.write("\n⚠️  DRY RUN - No changes were made to the database.")
            self.stdout.write("   Run without --dry-run to apply changes.")
        else:
            self.stdout.write(
                f"\n✅ Successfully fixed {total_fixed_name} products in database: {db}"
            )
            if fix_all_tech:
                self.stdout.write(
                    f"✅ Fixed {total_fixed_variant} variant translations"
                )
            if fix_category:
                self.stdout.write(
                    f"✅ Fixed {total_fixed_category} category translations"
                )
            if fix_brands:
                self.stdout.write(
                    f"✅ Fixed {total_fixed_brands} brand name translations"
                )
            if fix_category_mapping:
                self.stdout.write(
                    f"✅ Fixed {total_fixed_category_mapping} category mappings"
                )

    def fix_apple_russian(self, ru_text):
        """
        Fix 'Яблоко айфон' to 'Apple iPhone' and fix MacBook translations
        """
        if not ru_text:
            return ru_text

        # List of patterns to fix
        patterns = [
            # "Яблоко айфон 16" → "Apple iPhone 16"
            (r"Яблоко\s+айфон\s+(\d+\s*\w*)", r"Apple iPhone \1"),
            (r"яблоко\s+айфон\s+(\d+\s*\w*)", r"Apple iPhone \1"),
            # "Яблоко Айфон 16" → "Apple iPhone 16" (capitalized)
            (r"Яблоко\s+Айфон\s+(\d+\s*\w*)", r"Apple iPhone \1"),
            # "Яблоко айфон" (without number) → "Apple iPhone"
            (r"Яблоко\s+айфон", "Apple iPhone"),
            (r"яблоко\s+айфон", "Apple iPhone"),
            (r"Яблоко\s+Айфон", "Apple iPhone"),
            # "Айфон от Яблоко" → "Apple iPhone"
            (r"Айфон\s+от\s+Яблоко", "Apple iPhone"),
            (r"айфон\s+от\s+яблоко", "Apple iPhone"),
            # Just "Яблоко" at start (might be other Apple products)
            (r"^Яблоко\s+", "Apple "),
            (r"^яблоко\s+", "Apple "),
        ]

        fixed = ru_text
        for pattern, replacement in patterns:
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)

        # Fix MacBook translations - "эир/эйр" to "Air"
        macbook_patterns = [
            # "Макбук" → "MacBook" (keep English)
            (r"Макбук", "MacBook"),
            (r"макбук", "MacBook"),
            # "Макбук Плюс" → "MacBook Plus" (translate "Plus" back)
            (r"Макбук\s+Плюс", "MacBook Plus"),
            (r"макбук\s+плюс", "MacBook Plus"),
            # "Макбук Про" → "MacBook Pro"
            (r"Макбук\s+Про", "MacBook Pro"),
            (r"макбук\s+про", "MacBook Pro"),
            # "Макбук Эйр" → "MacBook Air"
            (r"Макбук\s+Эйр", "MacBook Air"),
            (r"макбук\s+эйр", "MacBook Air"),
            (r"Макбук\s+Эир", "MacBook Air"),
            (r"макбук\s+эир", "MacBook Air"),
            (r"Макбук\s+Аир", "MacBook Air"),
            (r"макбук\s+аир", "MacBook Air"),
            # "Макбук Эйр" standalone
            (r"Эйр", "Air"),
            (r"эйр", "Air"),
            (r"Эир", "Air"),
            (r"эир", "Air"),
            (r"Аир", "Air"),
            (r"аир", "Air"),
            # "Макбук Плюс Эйр" → "MacBook Plus Air"
            (r"Макбук\s+Плюс\s+Эйр", "MacBook Plus Air"),
            (r"макбук\s+плюс\s+эйр", "MacBook Plus Air"),
            (r"Макбук\s+Плюс\s+Эир", "MacBook Plus Air"),
            (r"макбук\s+плюс\s+эир", "MacBook Plus Air"),
        ]

        for pattern, replacement in macbook_patterns:
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)

        # Fix other Apple products
        apple_products = [
            (r"Яблоко\s+айпад", "iPad"),
            (r"яблоко\s+айпад", "iPad"),
            (r"Яблоко\s+Айпад", "iPad"),
            (r"айпад", "iPad"),  # Standalone
            (r"Айпад", "iPad"),
            (r"Яблоко\s+вотч", "Apple Watch"),
            (r"яблоко\s+вотч", "Apple Watch"),
            (r"Яблоко\s+Вотч", "Apple Watch"),
            (r"вотч", "Watch"),  # Standalone
            (r"Вотч", "Watch"),
            (r"Яблоко\s+тв", "Apple TV"),
            (r"яблоко\s+тв", "Apple TV"),
            (r"Яблоко\s+ТВ", "Apple TV"),
            (r"Яблоко\s+Тв", "Apple TV"),
        ]

        for pattern, replacement in apple_products:
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)

        return fixed

    def fix_brand_translations(self, ru_text):
        """
        Fix brand name translations that should stay in English
        """
        if not ru_text:
            return ru_text

        # Brand fixes - brands should stay in English, not translated to Russian
        brand_fixes = [
            # Xiaomi brand
            (r"Сяоми", "Xiaomi"),
            (r"сяоми", "Xiaomi"),
            (r"Ксяоми", "Xiaomi"),
            (r"ксяоми", "Xiaomi"),
            # Xiaomi models
            (r"Редми", "Redmi"),
            (r"редми", "Redmi"),
            (r"Примечание", "Note"),
            (r"примечание", "Note"),
            (r"Сяоми Редми Примечание", "Xiaomi Redmi Note"),
            (r"сяоми редми примечание", "Xiaomi Redmi Note"),
            # Samsung brand
            (r"Самсунг", "Samsung"),
            (r"самсунг", "Samsung"),
            # Samsung models
            (r"Галакси", "Galaxy"),
            (r"галакси", "Galaxy"),
            (r"Галактика", "Galaxy"),
            (r"галактика", "Galaxy"),
            (r"Самсунг Галакси", "Samsung Galaxy"),
            (r"самсунг галакси", "Samsung Galaxy"),
            # Huawei brand
            (r"Хуавей", "Huawei"),
            (r"хуавей", "Huawei"),
            (r"Хуавей П", "Huawei P"),
            (r"хуавей п", "Huawei P"),
            # Nothing brand
            (r"Ничего", "Nothing"),
            (r"ничего", "Nothing"),
            (r"Ничего Телефон", "Nothing Phone"),
            (r"ничего телефон", "Nothing Phone"),
            # Cubot brand
            (r"Кубот", "Cubot"),
            (r"кубот", "Cubot"),
            (r"Кинг-Конг", "King Kong"),
            (r"Кинг Конг", "King Kong"),
            (r"кинг-конг", "King Kong"),
            # Nokia brand
            (r"Нокиа", "Nokia"),
            (r"нокиа", "Nokia"),
            # Ulefone brand
            (r"Улефон", "Ulefone"),
            (r"улефон", "Ulefone"),
            (r"Броня", "Armor"),
            (r"броня", "Armor"),
            (r"Улефон Броня", "Ulefone Armor"),
            (r"улефон броня", "Ulefone Armor"),
            # Hama brand
            (r"Хама", "Hama"),
            (r"хама", "Hama"),
            (r"Россано", "Rossano"),
            (r"россано", "Rossano"),
            (r"Белая", "White"),
            (r"белая", "White"),
            (r"Хама ", "Hama"),
            (r"хама", "Hama"),
            # New brand fixes from the list
            # A500 Best - А500 Лучший → A500 Best
            (r"А500\s+Лучший", "A500 Best"),
            (r"а500\s+лучший", "A500 Best"),
            # Blade A512 - Лезвие А512 → Blade A512
            (r"Лезвие\s+А512", "Blade A512"),
            (r"лезвие\s+а512", "Blade A512"),
            # Caterpillar S40 - Гусеница С40 → Caterpillar S40
            (r"Гусеница\s+С40", "Caterpillar S40"),
            (r"гусеница\s+с40", "Caterpillar S40"),
            # Nomi i245 - Номи i245 → Nomi i245
            (r"Номи\s+i245", "Nomi i245"),
            (r"номи\s+i245", "Nomi i245"),
            # V7 Lite - В7 Лайт → V7 Lite
            (r"В7\s+Лайт", "V7 Lite"),
            (r"в7\s+лайт", "V7 Lite"),
            # Vibe K5 A6020a40 - Вайб К5 А6020а40 → Vibe K5 A6020a40
            (r"Вайб\s+К5", "Vibe K5"),
            (r"вайб\s+к5", "Vibe K5"),
            (r"Вайб\s+К5\s+А6020а40", "Vibe K5 A6020a40"),
            (r"вайб\s+к5\s+а6020а40", "Vibe K5 A6020a40"),
        ]

        fixed = ru_text
        for pattern, replacement in brand_fixes:
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)

        return fixed

    def fix_all_tech_terms(self, ru_text):
        """
        Fix common tech term mistranslations in Russian
        """
        if not ru_text:
            return ru_text

        # Common tech terms that should stay in English or use correct transliteration
        tech_fixes = [
            # Brands
            (r"делл", "Dell"),
            (r"Делл", "Dell"),
            (r"асус", "ASUS"),
            (r"Асус", "ASUS"),
            (r"асуз", "ASUS"),
            (r"Асуз", "ASUS"),
            (r"леново", "Lenovo"),
            (r"Леново", "Lenovo"),
            # ASUS ROG - fix "рог" to "ROG"
            (r"асус\s+рог", "ASUS ROG"),
            (r"Асус\s+Рог", "ASUS ROG"),
            (r"асуз\s+рог", "ASUS ROG"),
            (r"Асуз\s+Рог", "ASUS ROG"),
            (r"\bрог\b", "ROG"),  # Standalone "рог"
            (r"\bРог\b", "ROG"),
            # Gaming brands
            # Other tech terms
            (r"эир", "Air"),
            (r"Эир", "Air"),
            (r"эйр", "Air"),
            (r"Эйр", "Air"),
            (r"плюс", "Plus"),
            (r"Плюс", "Plus"),
            (r"макс", "Max"),
            (r"Макс", "Max"),
            # Кровавая -> Bloody (anywhere in text, word boundary aware)
            (r"\bКровавая\b", "Bloody"),
            (r"\bкровавая\b", "Bloody"),
            # Ventilator -> Вентилятор
            (r"Ventilator", "Вентилятор"),
            (r"ventilator", "вентилятор"),
        ]

        fixed = ru_text
        for pattern, replacement in tech_fixes:
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)

        return fixed

    def fix_variant_russian(self, ru_variant):
        """
        Fix variant translations (RAM, storage, color)
        """
        if not ru_variant:
            return ru_variant

        # Common variant fixes
        variant_fixes = [
            # RAM/storage units
            # Common tech terms in variants
            (r"эир", "Air"),
            (r"эйр", "Air"),
            (r"макс", "Max"),
            (r"плюс", "Plus"),
            # Кровавая -> Bloody
            (r"Кровавый\s+", "Bloody"),
            (r"\bКровавый\b", "Bloody"),
            (r"«Кровавый»\s+", "Bloody"),
            (r"\«Кровавый»\b", "Bloody"),
            (r"Кровавая\s+", "Bloody"),
            (r"\bКровавая\b", "Bloody"),
            (r"«Кровавая»\s+", "Bloody"),
            (r"\«Кровавая»\b", "Bloody"),
        ]

        fixed = ru_variant
        for pattern, replacement in variant_fixes:
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)

        return fixed

    def fix_category_russian(self, ru_category, t_name):
        """
        Fix category translations
        """
        if not ru_category:
            return ru_category

        # Check if this is an Apple product
        name_en = t_name.get("en", "") if t_name else ""
        name_ru = t_name.get("ru", "") if t_name else ""

        is_apple = any(
            term in str(name_en).lower() or term in str(name_ru).lower()
            for term in [
                "iphone",
                "ipad",
                "macbook",
                "apple watch",
                "macbook air",
                "macbook pro",
            ]
        )

        if is_apple:
            # Fix Apple-specific categories
            fixes = [
                (r"Яблоко\s+айфон", "iPhone"),
                (r"яблоко\s+айфон", "iPhone"),
                (r"смартфон\s+Яблоко", "iPhone, смартфон"),
                (r"телефон\s+Яблоко", "iPhone, телефон"),
                (r"ноутбук\s+Яблоко", "MacBook, ноутбук"),
                (r"ноутбук\s+яблоко", "MacBook, ноутбук"),
                (r"Макбук", "MacBook"),
                (r"макбук", "MacBook"),
                (r"Макбук\s+Эйр", "MacBook Air"),
                (r"Макбук\s+Эир", "MacBook Air"),
                (r"макбук\s+эйр", "MacBook Air"),
                (r"макбук\s+эир", "MacBook Air"),
            ]

            fixed = ru_category
            for pattern, replacement in fixes:
                fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)

            return fixed

        # Add the specific fixes you requested
        fixes = [
            # блокнот -> ноутбук
            (r"блокнот", "ноутбук"),
            (r"Блокнот", "Ноутбук"),
            # яблоко макбук -> ноутбук
            (r"Яблоко\s+Макбук", "ноутбук"),
            (r"яблоко\s+макбук", "ноутбук"),
            (r"Яблоко MacBook", "ноутбук"),
            # опорные плиты -> материнская плата
            (r"Опорные\s+плиты", "материнская плата"),
            (r"опорные\s+плиты", "материнская плата"),
            (r"Опорные плиты", "материнская плата"),
            # случаи -> корпус
            (r"Случаи", "корпус"),
            (r"случаи", "корпус"),
            # корпус -> корпус ПК, компоненты ПК (exact match only)
            (r"^корпус$", "корпус ПК, компоненты ПК"),
        ]

        fixed = ru_category
        for pattern, replacement in fixes:
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)

        return fixed

    def fix_category_based_on_ro_mapping(self, ru_category, ro_category):
        """
        Fix category translations based on Romanian category mapping
        """
        if not ru_category or not ro_category:
            return ru_category

        ro_lower = ro_category.lower()

        # Comprehensive category mapping based on Romanian categories
        # Use exact Romanian phrases as keys for better matching
        category_mapping = {
            # Accesorii categories
            "accesorii apple": "оригинальные аксессуары Apple",
            "accesorii gaming": "геймерские аксессуары, кабели и контроллеры",
            "accesorii tableta": "аксессуары для планшетов, чехлы для планшетов",
            "accesorii tv": "аксессуары для телевизоров, ТВ аксессуары",
            # Computer categories
            "aspirator robot": "роботы-пылесосы",
            "birou calculator, mobilier": "компьютерные столы, офисная мебель",
            "birou, mobilier": "офисные столы, офисная мебель",
            "cabluri, accesorii": "кабели и аксессуары",
            # Camera categories
            "camera actiune": "экшн-камеры, GoPro",
            "camera web, periferice pc": "веб-камеры, периферия для ПК",
            # Office accessories
            "cană, accesorii birou": "кружки и офисные аксессуары",
            # PC components
            "carcasa pc, componente pc": "корпуса для ПК, компоненты ПК",
            "casti gaming, audio": "геймерские наушники, аудио",
            "casti, audio": "наушники и аудио",
            # Console and gaming
            "console jocuri": "игровые консоли",
            "consumabile imprimanta": "расходные материалы для принтеров",
            "controller jocuri, accesorii gaming": "геймпады и игровые аксессуары",
            # PC accessories
            "docking station, accesorii pc": "док-станции, аксессуары для ПК",
            "ecrane proiectie": "проекционные экраны",
            # Office equipment
            "imprimanta, birou": "принтеры, офисное оборудование",
            "incarcatoare, accesorii mobile": "зарядные устройства, мобильные аксессуары",
            # Games
            "jocuri video": "видеоигры",
            # Lighting
            "lampa birou, iluminat": "настольные лампы, освещение",
            # Laptop accessories
            "laptop accessories": "аксессуары для ноутбуков",
            # Laptops
            "laptop gaming, notebook gaming": "игровые ноутбуки",
            "laptop, notebook": "ноутбуки и портативные компьютеры",
            # Media
            "media player": "медиаплееры",
            # PC components
            "memorie ram, componente pc": "оперативная память, компоненты ПК",
            # Merchandising
            "merchandising, fan gear": "мерчандайзинг, фанатская атрибутика",
            "merchandising, gaming": "геймерский мерчандайзинг",
            # Audio equipment
            "microfon gaming, audio": "геймерские микрофоны, аудио",
            "microfon, audio": "микрофоны и аудио",
            # Mini PCs
            "mini pc, apple": "мини-ПК Apple",
            "mini pc, desktop": "мини-ПК, настольные компьютеры",
            # Monitors
            "monitor gaming, display": "игровые монитор, дисплеи",
            "monitor, display": "мониторы и дисплеи",
            # PC peripherals
            "mouse gaming, periferice pc": "геймерские мыши, периферия для ПК",
            "mouse pad gaming, accesorii pc": "геймерские коврики для мыши, аксессуары для ПК",
            "mouse pad, accesorii pc": "коврики для мыши, аксессуары для ПК",
            "mouse, periferice pc": "компьютерные мыши, периферия для ПК",
            # PCs
            "pc all in one, apple": "моноблоки Apple",
            "pc all in one, desktop": "моноблоки, настольные компьютеры",
            "pc desktop, apple": "настольные компьютеры Apple",
            "pc desktop, sistem complet": "настольные ПК, готовые системы",
            "pc gaming, desktop gaming": "игровые ПК, гейминг-компьютеры",
            # PC peripherals
            "periferice pc": "периферийные устройства для ПК",
            # Motherboards and components
            "placa de baza, motherboard, componente pc": "материнские платы, компоненты ПК",
            "placa video, gpu, componente pc": "видеокарты, GPU, компоненты ПК",
            # Mobile accessories
            "power bank, accesorii mobile": "пауэрбанки, мобильные аксессуары",
            # Processors
            "procesor, cpu, componente pc": "процессоры, CPU, компоненты ПК",
            # Projectors
            "proiectoare, display": "проекторы и дисплеи",
            # Network protection
            "protectie retea, birou": "сетевые фильтры, офисное оборудование",
            "protectie telefon, accesorii mobile": "защита для телефонов, мобильные аксессуары",
            # PC cooling
            "racire pc, accesorii": "системы охлаждения для ПК, аксессуары",
            "racire pc, cooler, componente pc": "охлаждение ПК, кулеры, компоненты ПК",
            # Network devices
            "router, dispozitiv retea": "роутеры, сетевые устройства",
            "router, wifi, dispozitiv retea": "роутеры, Wi-Fi, сетевые устройства",
            # Office equipment
            "scanner, birou": "сканеры, офисное оборудование",
            # Chairs
            "scaun birou, mobilier": "офисные стулья, мебель",
            "scaun gaming, mobilier birou": "геймерские кресла, офисная мебель",
            # Shredders
            "shredder, birou": "шредеры, офисное оборудование",
            # Phones
            "smartphone, telefon mobil": "смартфоны, мобильные телефоны",
            "smartwatch": "умные часы",
            # Software
            "software": "программное обеспечение",
            # Office accessories
            "sticlă apă, accesorii birou": "бутылки для воды, офисные аксессуары",
            # Storage
            "stocare externa, hdd, accesorii pc": "внешние накопители, HDD, аксессуары для ПК",
            "stocare interna, hdd, componente pc": "внутренние накопители, HDD, компоненты ПК",
            "stocare interna, ssd, componente pc": "внутренние накопители, SSD, компоненты ПК",
            "stocare interna, ssd, hdd, componente pc": "внутренние накопители, SSD, HDD, компоненты ПК",
            # Car accessories
            "suport auto telefon, accesorii auto": "автомобильные держатели для телефонов, автоАксессуары",
            # Monitor/TV supports
            "suport monitor, accesorii birou": "подставки для мониторов, офисные аксессуары",
            "suport tv, accesorii tv": "кронштейны для ТВ, аксессуары для телевизоров",
            # Power supplies
            "sursa pc, psu, componente pc": "блоки питания для ПК, PSU, компоненты ПК",
            # Network switches
            "switch, poe, dispozitiv retea": "коммутаторы, PoE, сетевые устройства",
            # Tablets
            "tableta": "планшеты",
            "tableta grafica": "графические планшеты",
            "tableta grafica, periferice pc": "графические планшеты, периферия для ПК",
            # Keyboards
            "tastatura gaming, periferice pc": "геймерские клавиатуры, периферия для ПК",
            "tastatura, periferice pc": "клавиатуры, периферия для ПК",
            # Phones
            "telefon fix, dect, birou": "стационарные телефоны, DECT, офисное оборудование",
            "telefon mobil, buton, feature phone": "мобильные телефоны, кнопочные телефоны",
            # TVs
            "televizor": "телевизоры",
        }

        # First try exact match
        if ro_lower in category_mapping:
            correct_translation = category_mapping[ro_lower]
            if ru_category.lower() != correct_translation.lower():
                return correct_translation

        # If no exact match, return original
        return ru_category
