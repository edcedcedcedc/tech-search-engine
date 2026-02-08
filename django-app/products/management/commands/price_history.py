from django.core.management.base import BaseCommand
from products.analytics.price_history import (
    PriceHistoryBuilder,
)  # adjust import path if needed


class Command(BaseCommand):
    help = "Run the price history builder manually"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Which database to use",
        )
        parser.add_argument(
            "--include_archived",
            action="store_true",
            help="Include archived products",
        )
        parser.add_argument(
            "--include_broken",
            action="store_true",
            help="Include broken products",
        )
        parser.add_argument(
            "--force_daily",
            action="store_true",
            help="Force a daily snapshot even if price/in_stock did not change",
        )

    def handle(self, *args, **options):
        builder = PriceHistoryBuilder(
            db=options["db"],
            include_archived=options["include_archived"],
            include_broken=options["include_broken"],
            force_daily=options["force_daily"],
        )

        self.stdout.write("[COMMAND] Starting PriceHistoryBuilder...\n")
        builder.run()
        self.stdout.write("[COMMAND] PriceHistoryBuilder finished.\n")
