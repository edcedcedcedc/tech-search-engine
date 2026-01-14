# file: products/management/commands/backfill_canonical_embeddings.py

"""import json
import numpy as np
from numpy.linalg import norm
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product
from products.utils.generate_canonical_id import generate_canonical_id
from rapidfuzz import fuzz
from products.utils.backfill_canonical_id_log import backfill_canonical_id_log

# Thresholds
EMBEDDING_THRESHOLD = 0.92  # strong embedding match
EMBEDDING_BORDERLINE = 0.85  # borderline match
FUZZY_THRESHOLD = 70  # fallback fuzzy score


def cosine_sim(a, b):
    return np.dot(a, b) / (norm(a) * norm(b))


class Command(BaseCommand):
    help = "Backfill canonical_id using embeddings + fuzzy hybrid"

    def add_arguments(self, parser):
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database alias (default, stage, etc.)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Recompute canonical_id even if it already exists",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=5000,
            help="Process products in memory batches (for memory control)",
        )

    def handle(self, *args, **options):
        db = options["db"]
        force = options["force"]
        batch_size = options["batch_size"]

        # Load products
        qs = Product.objects.using(db).all()
        if not force:
            qs = qs.filter(canonical_id__isnull=True)

        total = qs.count()
        backfill_canonical_id_log(f"START embeddings backfill db={db}, total={total}")

        products = list(qs)

        # Convert embeddings to numpy arrays
        for p in products:
            if not p.embedding:
                raise ValueError(f"Product {p.id} has no embedding!")
            p.vec = np.array(json.loads(p.embedding), dtype=np.float32)

        # --------- Cluster products ---------
        clusters = []

        for p in products:
            placed = False

            for cluster in clusters:
                rep = cluster[0]

                # Only compare same category
                if p.category != rep.category:
                    continue

                sim = cosine_sim(p.vec, rep.vec)

                # Strong embedding match
                if sim >= EMBEDDING_THRESHOLD:
                    cluster.append(p)
                    placed = True
                    break

                # Borderline embedding -> fallback fuzzy
                elif sim >= EMBEDDING_BORDERLINE:
                    full_name_p = f"{p.name} {p.variant}".lower()
                    full_name_rep = f"{rep.name} {rep.variant}".lower()
                    fuzzy_score = fuzz.token_set_ratio(full_name_p, full_name_rep)
                    if fuzzy_score >= FUZZY_THRESHOLD:
                        cluster.append(p)
                        placed = True
                        break

            if not placed:
                clusters.append([p])

        backfill_canonical_id_log(f"Clustering done, {len(clusters)} clusters formed")

        # --------- Assign canonical_id per cluster ---------
        processed = 0
        for cluster in clusters:
            rep = cluster[0]
            text_for_id = " ".join(filter(None, [rep.name, rep.variant, rep.brand]))
            canonical_id = generate_canonical_id(text_for_id)

            with transaction.atomic(using=db):
                for p in cluster:
                    p.canonical_id = canonical_id
                    p.save(update_fields=["canonical_id"])
                    backfill_canonical_id_log(
                        f"SET canonical_id={canonical_id} db={db} product_id={p.id} "
                        f"shop={p.shop} name='{p.name}' variant='{p.variant}' brand='{p.brand}'"
                    )
            processed += len(cluster)

        backfill_canonical_id_log(
            f"END embeddings backfill db={db}, processed={processed}/{total}"
        )
"""


# file: products/management/commands/backfill_canonical_embeddings.py
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product
from products.utils.generate_canonical_id import generate_canonical_id
from products.utils.backfill_canonical_id_log import backfill_canonical_id_log
import json
import numpy as np
from numpy.linalg import norm
from rapidfuzz import fuzz

EMBEDDING_THRESHOLD = 0.80  # cosine similarity threshold
FUZZY_THRESHOLD = 70  # fallback fuzzy threshold


def cosine_sim(a, b):
    return np.dot(a, b) / (norm(a) * norm(b))


def load_embedding(product):
    if not product.embedding:
        return None
    return np.array(json.loads(product.embedding))


class Command(BaseCommand):
    help = (
        "Backfill canonical_id using embeddings and fuzzy as backup (centroid method)"
    )

    def add_arguments(self, parser):
        parser.add_argument("--batch_size", type=int, default=1000)
        parser.add_argument("--db", type=str, default="default")
        parser.add_argument(
            "--force", action="store_true", help="Recompute canonical_id even if exists"
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        database = options["db"]
        force = options["force"]

        qs = Product.objects.using(database).all()
        if not force:
            qs = qs.filter(canonical_id__isnull=True)

        total = qs.count()
        backfill_canonical_id_log(
            f"START embedding backfill db={database}, total={total}"
        )

        # Load all products
        offset = 0
        products = []
        while True:
            batch = list(qs.order_by("id")[offset : offset + batch_size])
            if not batch:
                break
            products.extend(batch)
            offset += batch_size

        backfill_canonical_id_log(f"Loaded {len(products)} products")

        clusters = []  # each cluster = {"centroid": np.array, "products": [Product]}

        for product in products:
            emb = load_embedding(product)
            if emb is None:
                # No embedding? fallback to fuzzy only
                added = False
                for cluster in clusters:
                    rep = cluster["products"][0]
                    full_name = f"{product.name} {product.variant}".lower()
                    rep_name = f"{rep.name} {rep.variant}".lower()
                    if fuzz.token_set_ratio(full_name, rep_name) >= FUZZY_THRESHOLD:
                        cluster["products"].append(product)
                        added = True
                        break
                if not added:
                    clusters.append({"centroid": None, "products": [product]})
                continue

            # Try embedding similarity first
            best_sim = -1
            best_cluster = None
            for cluster in clusters:
                if cluster["centroid"] is None:
                    continue
                sim = cosine_sim(emb, cluster["centroid"])
                if sim > best_sim:
                    best_sim = sim
                    best_cluster = cluster

            if best_sim >= EMBEDDING_THRESHOLD:
                # Assign to best cluster
                best_cluster["products"].append(product)
                # Update cluster centroid
                all_embs = [
                    load_embedding(p)
                    for p in best_cluster["products"]
                    if load_embedding(p) is not None
                ]
                best_cluster["centroid"] = np.mean(all_embs, axis=0)
            else:
                # No good embedding match -> create new cluster
                clusters.append({"centroid": emb, "products": [product]})

        backfill_canonical_id_log(f"Formed {len(clusters)} clusters")

        # ---------- Assign canonical_id ----------
        processed = 0
        for cluster in clusters:
            rep = cluster["products"][0]
            text_for_id = " ".join(filter(None, [rep.name, rep.variant, rep.brand]))
            canonical_id = generate_canonical_id(text_for_id)

            with transaction.atomic(using=database):
                for p in cluster["products"]:
                    p.canonical_id = canonical_id
                    p.save(update_fields=["canonical_id"])
                    backfill_canonical_id_log(
                        f"SET canonical_id={canonical_id} db={database} product_id={p.id} "
                        f"shop={p.shop} name='{p.name}' variant='{p.variant}' brand='{p.brand}'"
                    )
            processed += len(cluster)

        backfill_canonical_id_log(
            f"END embedding backfill db={database}, processed={processed}"
        )
