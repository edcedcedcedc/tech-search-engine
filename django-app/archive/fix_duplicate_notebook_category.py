from django.core.management.base import BaseCommand
from products.models import Product


class Command(BaseCommand):
    help = (
        "Fix duplicate 'ноутбук, ноутбук' and 'ноутбук ноутбук' in Russian categories"
    )

    def handle(self, *args, **options):
        self.stdout.write("🔧 Fixing duplicate ноутбук in Russian categories...")

        # Get all products with Russian category translations
        products = (
            Product.objects.using("stage")
            .exclude(t_category__isnull=True)
            .exclude(t_category={})
        )

        total_fixed = 0

        for product in products:
            try:
                t_category = product.t_category or {}
                ru_category = t_category.get("ru", "")

                if ru_category:
                    original_category = ru_category
                    fixed_category = ru_category

                    # Fix multiple patterns
                    patterns_to_fix = [
                        "ноутбук, ноутбук",  # with comma
                        "ноутбук ноутбук",  # without comma
                        "ноутбук,ноутбук",  # no space after comma
                    ]

                    for pattern in patterns_to_fix:
                        if pattern in fixed_category:
                            # Replace the duplicate with single "ноутбук"
                            fixed_category = fixed_category.replace(pattern, "ноутбук")

                    # Also fix any remaining duplicate patterns
                    # Replace "игровой ноутбук, ноутбук для игр" with just "игровой ноутбук"
                    if "игровой ноутбук, ноутбук для игр" in fixed_category:
                        fixed_category = fixed_category.replace(
                            "игровой ноутбук, ноутбук для игр", "игровой ноутбук"
                        )

                    # Remove any trailing commas left after fixing
                    fixed_category = fixed_category.replace(", ,", ",")
                    fixed_category = fixed_category.strip(", ")

                    # If anything changed, save it
                    if fixed_category != original_category:
                        product.t_category["ru"] = fixed_category
                        product.save(update_fields=["t_category"])

                        total_fixed += 1

                        # Log the fix (only first few to avoid spam)
                        if total_fixed <= 20:
                            self.stdout.write(f"✅ Fixed product {product.id}:")
                            self.stdout.write(f"   Was: '{original_category}'")
                            self.stdout.write(f"   Now: '{fixed_category}'")

            except Exception as e:
                self.stdout.write(f"⚠️  Error processing product {product.id}: {e}")

        # Show summary
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(
            f"✅ Fixed {total_fixed} products with duplicate 'ноутбук' patterns"
        )
        self.stdout.write(f"{'='*60}")
