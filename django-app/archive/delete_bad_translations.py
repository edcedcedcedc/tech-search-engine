from django.core.management.base import BaseCommand
from products.models import Product


class Command(BaseCommand):
    help = "Clear translations for specific problematic products"

    def handle(self, *args, **options):
        # These are the IDs from your logs that have wrong translations
        problematic_ids = [
            9391,  # Product with 'Power Bank Сяоми' → 'Power Bank Xiaomi' and 'Яблоко айфон' in category
            7732,  # Product with 'Яблоко айфон' in category
            7602,  # Product with 'Яблоко айфон' in category
            7248,  # Product with 'Яблоко айфон' in category
            13254,  # Product with 'Клавиатура Apple Magic...' and 'Яблоко айфон' in category
        ]

        cleared_count = 0

        for pid in problematic_ids:
            try:
                product = Product.objects.using("stage").get(id=pid)

                # Clear translations
                if product.t_name:
                    product.t_name["en"] = ""
                    product.t_name["ru"] = ""

                if product.t_variant:
                    product.t_variant["en"] = ""
                    product.t_variant["ru"] = ""

                if product.t_category:
                    product.t_category["en"] = ""
                    product.t_category["ru"] = ""

                product.save()
                cleared_count += 1
                self.stdout.write(f"✅ Cleared translations for product {pid}")

            except Product.DoesNotExist:
                self.stdout.write(f"⚠️  Product {pid} not found")
            except Exception as e:
                self.stdout.write(f"❌ Error clearing product {pid}: {e}")

        self.stdout.write(f"\n✅ Cleared translations for {cleared_count} products")
        self.stdout.write(f"📊 Run translation command again with a better model")
