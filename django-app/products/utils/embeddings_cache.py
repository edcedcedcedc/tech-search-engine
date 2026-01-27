import json
import numpy as np
from django.db import close_old_connections
from products.utils.log.load_embeddings_cache_log import load_embeddings_cache_log

PRODUCT_IDS = None
PRODUCT_EMBEDDINGS = None
EMBEDDINGS_NORM = None


def load_embeddings_cache():
    from products.models import Product

    global PRODUCT_IDS, PRODUCT_EMBEDDINGS, EMBEDDINGS_NORM
    close_old_connections()

    qs = Product.objects.filter(embedding__isnull=False).only("id", "embedding")
    total = qs.count()  # total number of products
    ids, vectors = [], []

    for i, p in enumerate(qs.iterator(chunk_size=1000), start=1):
        try:
            vec = np.array(json.loads(p.embedding), dtype=np.float32)
            ids.append(p.id)
            vectors.append(vec)
        except Exception:
            continue

        # Log progress every 1000 products or at the end
        if i % 1000 == 0 or i == total:
            pct = (i / total) * 100
            load_embeddings_cache_log(
                f"[Embedding cache] Loaded {i}/{total} ({pct:.1f}%) vectors"
            )

    PRODUCT_IDS = np.array(ids, dtype=np.int32)
    PRODUCT_EMBEDDINGS = np.vstack(vectors)
    EMBEDDINGS_NORM = np.linalg.norm(PRODUCT_EMBEDDINGS, axis=1)

    load_embeddings_cache_log(
        f"[Embedding cache] Finished loading {len(PRODUCT_IDS)} vectors, shape={PRODUCT_EMBEDDINGS.shape}"
    )
