from django.core.management.base import BaseCommand
from products.models import Product


class Command(BaseCommand):
    help = "Fix broken t_category for dirty products on stage DB"

    def handle(self, *args, **options):
        qs = Product.objects.using("stage").filter(dirty=True)
        updated_count = 0

        for p in qs:
            # Ensure we always create a new t_category dict
            tcat = {
                "ro": p.category if p.category else "",
                "en": "",
                "ru": "",
            }

            p.t_category = tcat
            p.save(using="stage")
            updated_count += 1
            self.stdout.write(f"Updated Product {p.id}: {p.t_category}")

        self.stdout.write(
            self.style.SUCCESS(f"Done! Updated {updated_count} dirty products.")
        )
