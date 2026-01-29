import json
import numpy as np
from numpy.linalg import norm
from django.db import transaction
from products.models import Product
from products.utils.log.backfill_similar_id_log import backfill_similar_id_log
from rapidfuzz import fuzz
import re
import hashlib
import unicodedata

STOPWORDS = {"new", "original", "orig", "model", "version", "gb", "tb", "ram", "rom"}
EMBEDDING_THRESHOLD = 0.85  # strong match, same product/brand
FUZZY_THRESHOLD = 75


class BackfillSimilarEmbeddings:
    """
    Backfill similar_id using embeddings + fuzzy as backup.
    Single-class version of Django command.
    Preserves all original semantics and logic.
    """

    def __init__(self, *, batch_size=1000, db="default", dirty=False, force=False):
        self.batch_size = batch_size
        self.database = db
        self.dirty = dirty
        self.force = force

    # ------------------------
    # Helpers
    # ------------------------
    @staticmethod
    def cosine_sim(a, b):
        return np.dot(a, b) / (norm(a) * norm(b))

    @staticmethod
    def generate_similar_id(base) -> str:
        normalized = BackfillSimilarEmbeddings.normalize_similar(base)
        return hashlib.sha1(normalized.encode("utf-8")).hexdigest()

    @staticmethod
    def normalize_similar(s: str) -> str:
        if not s:
            return ""
        s = s.lower()
        s = unicodedata.normalize("NFKD", s)
        s = s.encode("ascii", "ignore").decode("ascii")
        s = re.sub(r"[^a-z0-9\s]", " ", s)
        s = re.sub(r"\s+", " ", s).strip()
        tokens = [t for t in s.split() if t not in STOPWORDS]
        return " ".join(tokens)

    @staticmethod
    def load_embedding(product):
        if not getattr(product, "_embedding", None):
            if not product.embedding:
                product._embedding = None
            else:
                product._embedding = np.array(json.loads(product.embedding))
        return product._embedding

    # ------------------------
    # Main run method
    # ------------------------
    def run(self):
        if self.force:
            qs = Product.objects.using(self.database).all()
        else:
            qs = Product.objects.using(self.database).filter(dirty=True)

        total = qs.count()
        backfill_similar_id_log(
            f"START embedding backfill db={self.database}, total={total}"
        )

        # Load all products in batches
        offset = 0
        products = []
        while True:
            batch = list(qs.order_by("id")[offset : offset + self.batch_size])
            if not batch:
                break
            products.extend(batch)
            offset += self.batch_size

        backfill_similar_id_log(f"Loaded {len(products)} products")

        # Precompute embeddings once
        for p in products:
            self.load_embedding(p)

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

            # Embedding similarity
            best_sim = -1
            best_cluster = None
            for cluster in clusters:
                if cluster["centroid"] is None:
                    continue
                sim = self.cosine_sim(emb, cluster["centroid"])
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

        backfill_similar_id_log(f"Formed {len(clusters)} clusters")

        # ---------- Assign similar_id ----------
        processed = 0
        all_updates = []

        for cluster in clusters:
            rep = cluster["products"][0]
            text_for_id = " ".join(filter(None, [rep.name, rep.variant, rep.brand]))
            similar_id = self.generate_similar_id(text_for_id)

            for p in cluster["products"]:
                p.similar_id = similar_id
                all_updates.append(p)
                backfill_similar_id_log(
                    f"SET similar_id={similar_id} db={self.database} product_id={p.id} "
                    f"shop={p.shop} name='{p.name}' variant='{p.variant}' brand='{p.brand}'"
                )
            processed += len(cluster)

        # Bulk update all products at once
        with transaction.atomic(using=self.database):
            Product.objects.using(self.database).bulk_update(
                all_updates, ["similar_id"]
            )

        backfill_similar_id_log(
            f"END embedding backfill db={self.database}, processed={processed}"
        )
