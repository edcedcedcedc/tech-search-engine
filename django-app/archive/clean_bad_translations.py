from django.core.management.base import BaseCommand
from products.models import Product
from django.db import transaction
from rapidfuzz import fuzz
import re

# First, check what would be deleted (dry run)
# python manage.py clean_bad_translations --dry-run --source=stage --threshold=30

# If results look good, run for real
# python manage.py clean_bad_translations --source=stage --threshold=30

# More strict cleaning (only keep very similar translations)
# python manage.py clean_bad_translations --source=stage --threshold=50

# Less strict (keep more translations)
# python manage.py clean_bad_translations --source=stage --threshold=20


class Command(BaseCommand):
    help = "Check translation similarity and delete bad GPT-5-nano translations"

    def add_arguments(self, parser):
        parser.add_argument(
            "--threshold",
            type=int,
            default=30,
            help="Minimum similarity score (0-100) to keep translation. Default 30",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without making changes",
        )
        parser.add_argument(
            "--source", type=str, default="stage", help="Database to use"
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=1000,
            help="Process in batches to avoid memory issues",
        )

    def normalize_text(self, text):
        """Normalize text for better comparison"""
        if not text:
            return ""

        text = str(text).lower()

        # Remove common words that don't affect meaning
        remove_words = [
            "для",
            "для",
            "for",
            "black",
            "white",
            "red",
            "blue",
            "gray",
            "серый",
            "черный",
            "белый",
            "красный",
            "синий",
        ]

        # Remove model numbers and special characters but keep key product info
        text = re.sub(r"[^\w\s-]", " ", text)  # Replace punctuation with space
        text = re.sub(r"\b\d+\b", " ", text)  # Remove standalone numbers
        text = re.sub(r"\s+", " ", text).strip()

        # Remove common words
        words = text.split()
        words = [w for w in words if w not in remove_words and len(w) > 2]

        return " ".join(words)

    def check_similarity(self, original, translation):
        """Check if translation is similar enough to original"""
        if not original or not translation:
            return 0

        # Direct fuzzy match
        direct_similarity = fuzz.ratio(original.lower(), translation.lower())

        # Token sort ratio (order insensitive)
        token_similarity = fuzz.token_sort_ratio(original.lower(), translation.lower())

        # Partial ratio (for partial matches)
        partial_similarity = fuzz.partial_ratio(original.lower(), translation.lower())

        # Use the highest similarity score
        return max(direct_similarity, token_similarity, partial_similarity)

    def handle(self, *args, **options):
        threshold = options["threshold"]
        dry_run = options["dry_run"]
        db = options["source"]
        batch_size = options["batch_size"]

        self.stdout.write(f"🔍 Checking translations with threshold: {threshold}")
        self.stdout.write(f"📊 Database: {db}")
        self.stdout.write(f"💾 Dry run: {dry_run}")

        # Get total count
        total_products = Product.objects.using(db).count()
        self.stdout.write(f"📦 Total products: {total_products}")

        # Process in batches
        deleted_count = 0
        checked_count = 0

        for offset in range(0, total_products, batch_size):
            batch = Product.objects.using(db).all()[offset : offset + batch_size]

            for product in batch:
                checked_count += 1

                if checked_count % 1000 == 0:
                    self.stdout.write(
                        f"⏳ Processed {checked_count}/{total_products} products..."
                    )

                try:
                    t_name = product.t_name or {}
                    t_variant = product.t_variant or {}
                    t_category = product.t_category or {}

                    original_name = product.name or ""
                    original_variant = product.variant or ""
                    original_category = product.category or ""

                    # Skip if no translations exist
                    if not any(
                        [
                            t_name.get("en"),
                            t_name.get("ru"),
                            t_variant.get("en"),
                            t_variant.get("ru"),
                            t_category.get("en"),
                            t_category.get("ru"),
                        ]
                    ):
                        continue

                    issues = []
                    updates_needed = False

                    # Check NAME translations
                    en_name = t_name.get("en", "")
                    ru_name = t_name.get("ru", "")

                    if en_name and original_name:
                        similarity = self.check_similarity(original_name, en_name)
                        if similarity < threshold:
                            issues.append(f"EN name ({similarity}% similar)")
                            t_name["en"] = ""  # Clear bad translation
                            updates_needed = True

                    if ru_name and original_name:
                        similarity = self.check_similarity(original_name, ru_name)
                        if similarity < threshold:
                            issues.append(f"RU name ({similarity}% similar)")
                            t_name["ru"] = ""  # Clear bad translation
                            updates_needed = True

                    # Check VARIANT translations (only if variant exists)
                    if original_variant:
                        en_variant = t_variant.get("en", "")
                        ru_variant = t_variant.get("ru", "")

                        if en_variant:
                            similarity = self.check_similarity(
                                original_variant, en_variant
                            )
                            if similarity < threshold:
                                issues.append(f"EN variant ({similarity}% similar)")
                                t_variant["en"] = ""
                                updates_needed = True

                        if ru_variant:
                            similarity = self.check_similarity(
                                original_variant, ru_variant
                            )
                            if similarity < threshold:
                                issues.append(f"RU variant ({similarity}% similar)")
                                t_variant["ru"] = ""
                                updates_needed = True

                    # Check CATEGORY translations
                    en_category = t_category.get("en", "")
                    ru_category = t_category.get("ru", "")

                    if en_category and original_category:
                        similarity = self.check_similarity(
                            original_category, en_category
                        )
                        if similarity < threshold:
                            issues.append(f"EN category ({similarity}% similar)")
                            t_category["en"] = ""
                            updates_needed = True

                    if ru_category and original_category:
                        similarity = self.check_similarity(
                            original_category, ru_category
                        )
                        if similarity < threshold:
                            issues.append(f"RU category ({similarity}% similar)")
                            t_category["ru"] = ""
                            updates_needed = True

                    # Check for obvious nonsense translations
                    # Example: Lenovo translated as Asus
                    brand_keywords = {
                        "lenovo": ["lenovo", "лэново", "леново"],
                        "asus": ["asus", "асус", "асуз"],
                        "hp": ["hp", "хп", "хр"],
                        "dell": ["dell", "делл", "дел"],
                        "acer": ["acer", "асер", "ацер"],
                        "msi": ["msi", "мси", "эмсиай"],
                        "gigabyte": ["gigabyte", "гигабайт", "гигабайт"],
                        "samsung": ["samsung", "самсунг"],
                        "apple": ["apple", "эпл", "апл"],
                    }

                    # Check if brand changed in translation
                    original_lower = original_name.lower()
                    en_lower = en_name.lower()
                    ru_lower = ru_name.lower()

                    for brand, keywords in brand_keywords.items():
                        original_has_brand = any(
                            keyword in original_lower for keyword in keywords
                        )
                        en_has_brand = any(keyword in en_lower for keyword in keywords)
                        ru_has_brand = any(keyword in ru_lower for keyword in keywords)

                        if original_has_brand and not en_has_brand and en_name:
                            # Brand missing in English translation
                            issues.append(f"Brand '{brand}' missing in EN")
                            t_name["en"] = ""
                            updates_needed = True

                        if original_has_brand and not ru_has_brand and ru_name:
                            # Brand missing in Russian translation
                            issues.append(f"Brand '{brand}' missing in RU")
                            t_name["ru"] = ""
                            updates_needed = True

                    if issues:
                        if not dry_run and updates_needed:
                            # Save the cleaned translations
                            product.t_name = t_name
                            product.t_variant = t_variant
                            product.t_category = t_category
                            product.save(
                                update_fields=["t_name", "t_variant", "t_category"]
                            )
                            deleted_count += 1

                        # Log the issue
                        if len(issues) <= 3:  # Don't spam log
                            self.stdout.write(f"\n❌ Product {product.id}:")
                            self.stdout.write(f"   Original: '{original_name[:80]}'")
                            if en_name:
                                self.stdout.write(f"   EN: '{en_name[:80]}'")
                            if ru_name:
                                self.stdout.write(f"   RU: '{ru_name[:80]}'")
                            self.stdout.write(f"   Issues: {', '.join(issues)}")

                except Exception as e:
                    self.stdout.write(f"⚠️  Error processing product {product.id}: {e}")

        # Summary
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write("SUMMARY")
        self.stdout.write(f"{'='*60}")

        if dry_run:
            self.stdout.write(
                f"📊 DRY RUN - Would delete {deleted_count} bad translations"
            )
            self.stdout.write(f"📊 Checked {checked_count} products")
        else:
            self.stdout.write(f"✅ Deleted {deleted_count} bad translations")
            self.stdout.write(f"📊 Checked {checked_count} products")

        self.stdout.write(f"\n📈 Threshold used: {threshold}")
        self.stdout.write(
            f"💡 Recommendation: {'Run without --dry-run to fix' if dry_run else 'Consider re-running translation command on cleaned products'}"
        )

        if deleted_count > 0 and not dry_run:
            self.stdout.write(
                f"\n🚀 Next step: Run translation command to fix cleared fields"
            )
            self.stdout.write(f"   python manage.py translate_products --source={db}")
