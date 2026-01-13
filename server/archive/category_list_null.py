from django.core.management.base import BaseCommand
from products.models import Product


class Command(BaseCommand):
    help = "List products with NULL category"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database alias (default, xstore, etc.)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=50,
            help="Limit number of products to print",
        )

    def handle(self, *args, **options):
        db = options["db"]
        limit = options["limit"]

        qs = Product.objects.using(db).filter(category__isnull=True).order_by("-id")

        total = qs.count()

        self.stdout.write(f"\n❌ Products with NULL category in DB '{db}': {total}\n")

        for p in qs[:limit]:
            self.stdout.write(
                f"[{p.id}] "
                f"shop={p.shop} | "
                f"name='{p.name}' | "
                f"variant='{p.variant}'"
            )

        if total > limit:
            self.stdout.write(f"\n... showing {limit} of {total}")

        self.stdout.write("\n✔ Done\n")
