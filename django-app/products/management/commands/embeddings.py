from django.core.management.base import BaseCommand

from products.tl.embeddings import ProductEmbedding

# ↑ adjust import path to where your class actually lives


class Command(BaseCommand):
    help = "Generate embeddings for products"

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=500)
        parser.add_argument("--retries", type=int, default=3)
        parser.add_argument("--force", action="store_true")
        parser.add_argument("--dirty", action="store_true")
        parser.add_argument("--source", type=str, default="default")
        parser.add_argument("--model", type=str, default="text-embedding-3-small")
        parser.add_argument("--dimensions", type=int, default=1536)

    def handle(self, *args, **options):
        runner = ProductEmbedding(
            batch_size=options["batch_size"],
            retries=options["retries"],
            force=options["force"],
            dirty=options["dirty"],
            source=options["source"],
            model=options["model"],
            dimensions=options["dimensions"],
        )

        runner.run()

        self.stdout.write(self.style.SUCCESS("Embedding job finished"))
