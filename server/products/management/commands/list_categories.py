from django.core.management.base import BaseCommand
from django.db.models import Count
from products.models import Product
from server.products.utils.category_list_log import category_list_log


class Command(BaseCommand):
    help = "List all distinct product categories in a database and log them"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database alias (default, xstore, etc.)",
        )

    def handle(self, *args, **options):
        db = options["db"]

        header = f"\nCategories in database: {db}\n"
        category_list_log(header)
        category_list_log(f"START category list for DB='{db}'")

        qs = (
            Product.objects.using(db)
            .values("category")
            .annotate(total=Count("id"))
            .order_by("-total")
        )

        if not qs:
            msg = "⚠ No categories found."
            category_list_log(msg)
            return

        for row in qs:
            category = row["category"] or ""
            count = row["total"]
            line = f"{count:5d}  |  {category}"

            category_list_log(line)

        category_list_log(f"END category list for DB='{db}'")
