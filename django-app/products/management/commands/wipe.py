from django.core.management.base import BaseCommand
from products.models import Product
import json


class Command(BaseCommand):
    help = "Remove EN/RU translations from t_name and t_variant (keeps RO) or print all translations with --vector"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            default="default",
            help="Database alias (default: default)",
        )
        parser.add_argument(
            "--vector",
            action="store_true",
            help="Print all products with their translations instead of wiping EN/RU",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=50,
            help="Limit number of products to print when using --vector (default: 50)",
        )

    def handle(self, *args, **options):
        db = options["db"]
        vector = options["vector"]
        limit = options["limit"]

        qs = Product.objects.using(db).all().order_by("id")

        if vector:
            # Print all products (up to limit) with t_name & t_variant nicely
            for product in qs[:limit]:
                self.stdout.write("=" * 80)
                self.stdout.write(f"id: {product.id}")
                self.stdout.write(f"name: {product.name}")
                self.stdout.write(
                    f"t_name: {json.dumps(product.t_name, ensure_ascii=False, indent=2)}"
                )
                self.stdout.write(f"variant: {product.variant}")
                self.stdout.write(
                    f"t_variant: {json.dumps(product.t_variant, ensure_ascii=False, indent=2)}"
                )
            self.stdout.write(
                self.style.SUCCESS(f"[{db}] Printed {min(limit, qs.count())} products")
            )
        else:
            # Remove EN/RU translations
            updated = 0
            for product in qs:
                changed = False

                # t_name
                t_name = product.t_name or {}
                if "en" in t_name:
                    t_name.pop("en")
                    changed = True
                if "ru" in t_name:
                    t_name.pop("ru")
                    changed = True

                # t_variant
                t_variant = product.t_variant or {}
                if "en" in t_variant:
                    t_variant.pop("en")
                    changed = True
                if "ru" in t_variant:
                    t_variant.pop("ru")
                    changed = True

                if changed:
                    product.t_name = t_name
                    product.t_variant = t_variant
                    product.save(using=db, update_fields=["t_name", "t_variant"])
                    updated += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"[{db}] EN/RU translations wiped for {updated} products"
                )
            )
