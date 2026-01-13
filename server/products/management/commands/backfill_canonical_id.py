# file: products/management/commands/backfill_canonical_fuzzy.py
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product
from products.utils.generate_canonical_id import generate_canonical_id
from products.utils.backfill_canonical_id_log import backfill_canonical_id_log
from rapidfuzz import fuzz

FUZZY_THRESHOLD = 70


class Command(BaseCommand):
    help = "Backfill canonical_id for all products using RapidFuzz fuzzy clustering"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch_size",
            type=int,
            default=1000,
            help="Number of products to process per batch",
        )
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database alias (e.g. default, xstore)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Recompute canonical_id even if it already exists",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        database = options["db"]
        force = options["force"]

        qs = Product.objects.using(database)
        if not force:
            qs = qs.filter(canonical_id__isnull=True)

        total = qs.count()
        backfill_canonical_id_log(f"START fuzzy backfill db={database}, total={total}")

        offset = 0
        processed = 0
        all_products = []

        # Load all products into memory batch by batch
        while True:
            batch = list(qs.order_by("id")[offset : offset + batch_size])
            if not batch:
                break
            all_products.extend(batch)
            offset += batch_size

        backfill_canonical_id_log(
            f"Loaded all products into memory, count={len(all_products)}"
        )

        # ---------- Stage 1: loose 70% fuzzy clustering ----------
        clusters = []

        for p in all_products:
            full_name = f"{p.name} {p.variant}".lower()
            placed = False

            for cluster in clusters:
                # rep = cluster[0]
                rep_name = f"{cluster[0].name} {cluster[0].variant}".lower()

                # NEVER merge if different category
                """ if p.category and rep.category:
                    if p.category.strip().lower() != rep.category.strip().lower():
                        continue """

                if fuzz.token_set_ratio(full_name, rep_name) >= FUZZY_THRESHOLD:
                    cluster.append(p)
                    placed = True
                    break
            if not placed:
                clusters.append([p])

        backfill_canonical_id_log(f"Stage 1 clustering done: {len(clusters)} clusters")

        # ---------- Stage 2: assign canonical_id per cluster ----------
        for cluster in clusters:
            # Generate canonical_id from first product in cluster
            rep = cluster[0]

            text_for_id = " ".join(filter(None, [rep.name, rep.variant, rep.brand]))
            canonical_id = generate_canonical_id(text_for_id)

            with transaction.atomic(using=database):
                for prod in cluster:
                    prod.canonical_id = canonical_id
                    prod.save(update_fields=["canonical_id"])
                    backfill_canonical_id_log(
                        f"SET canonical_id={canonical_id} "
                        f"db={database} product_id={prod.id} "
                        f"shop={prod.shop} name='{prod.name}' variant='{prod.variant}' brand='{prod.brand}'"
                    )

            processed += len(cluster)

        backfill_canonical_id_log(
            f"END fuzzy backfill db={database}, processed={processed}"
        )
