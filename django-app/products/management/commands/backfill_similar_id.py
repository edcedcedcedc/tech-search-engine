from django.core.management.base import BaseCommand

from products.tl.canonical import (
    BackfillSimilarEmbeddings,
)

# ↑ adjust import path to where the class actually lives


class Command(BaseCommand):
    help = "Backfill similar_id using embeddings with fuzzy fallback"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=1000,
            help="Batch size for loading products",
        )
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database alias to use",
        )
        parser.add_argument(
            "--dirty",
            action="store_true",
            help="Only process dirty products (default behavior)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Process all products, ignoring dirty flag",
        )

    def handle(self, *args, **options):
        runner = BackfillSimilarEmbeddings(
            batch_size=options["batch_size"],
            db=options["db"],
            dirty=options["dirty"],
            force=options["force"],
        )

        runner.run()

        self.stdout.write(self.style.SUCCESS("Backfill similar_id job finished"))
