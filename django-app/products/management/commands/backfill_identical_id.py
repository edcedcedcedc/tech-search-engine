# file: products/management/commands/backfill_identical_embeddings.py
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product
from products.utils.log.backfill_identical_id_log import backfill_identical_id_log
import json
import numpy as np
from numpy.linalg import norm
from rapidfuzz import fuzz


EMBEDDING_THRESHOLD = 0.95  # cosine identicality threshold
FUZZY_THRESHOLD = 80  # fallback fuzzy threshold


# products/utils/identical.py
import re
import hashlib
import unicodedata

# Optional: stopwords you don’t want affecting IDs
STOPWORDS = {"new", "original", "orig", "model", "version", "gb", "tb", "ram", "rom"}


def generate_identical_id(base) -> str:
    """Generate a stable SHA-1 hash as identical ID."""
    normalized = normalize_identical(base)
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()


def normalize_identical(s: str) -> str:
    """Normalize product text for identical ID."""
    if not s:
        return ""

    # lowercase and remove accents
    s = s.lower()
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii")

    # keep letters and numbers only
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()

    # remove stopwords
    tokens = [t for t in s.split() if t not in STOPWORDS]
    return " ".join(tokens)


def cosine_sim(a, b):
    return np.dot(a, b) / (norm(a) * norm(b))


def load_embedding(product):
    """Parse embedding JSON once and cache in product._embedding"""
    if not getattr(product, "_embedding", None):
        if not product.embedding:
            product._embedding = None
        else:
            product._embedding = np.array(json.loads(product.embedding))
    return product._embedding


class Command(BaseCommand):
    help = (
        "Backfill identical_id using embeddings and fuzzy as backup (centroid method)"
    )

    def add_arguments(self, parser):
        parser.add_argument("--batch_size", type=int, default=1000)
        parser.add_argument("--db", type=str, default="default")
        parser.add_argument("--dirty", default=False)

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        database = options["db"]
        dirty = options["dirty"]

        qs = Product.objects.using(database).all()
        if dirty:
            qs = qs.filter(dirty=True)

        total = qs.count()
        backfill_identical_id_log(
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

        backfill_identical_id_log(f"Loaded {len(products)} products")

        # Precompute embeddings once
        for p in products:
            load_embedding(p)

        clusters = []  # each cluster = {"centroid": np.array, "products": [Product]}

        for product in products:
            emb = product._embedding
            if emb is None:
                # fallback to fuzzy
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

            # Embedding identicality
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
                best_cluster["products"].append(product)
                # Update centroid efficiently with vectorized mean
                embs = np.array(
                    [
                        p._embedding
                        for p in best_cluster["products"]
                        if p._embedding is not None
                    ]
                )
                best_cluster["centroid"] = np.mean(embs, axis=0)
            else:
                clusters.append({"centroid": emb, "products": [product]})

        backfill_identical_id_log(f"Formed {len(clusters)} clusters")

        # ---------- Assign identical_id ----------
        processed = 0
        all_updates = []

        for cluster in clusters:
            rep = cluster["products"][0]
            text_for_id = " ".join(filter(None, [rep.name, rep.variant, rep.brand]))
            identical_id = generate_identical_id(text_for_id)

            for p in cluster["products"]:
                p.identical_id = identical_id
                all_updates.append(p)
                backfill_identical_id_log(
                    f"SET identical_id={identical_id} db={database} product_id={p.id} "
                    f"shop={p.shop} name='{p.name}' variant='{p.variant}' brand='{p.brand}'"
                )
            processed += len(cluster)

        # Bulk update all products at once
        with transaction.atomic(using=database):
            Product.objects.using(database).bulk_update(all_updates, ["identical_id"])

        backfill_identical_id_log(
            f"END embedding backfill db={database}, processed={processed}"
        )
