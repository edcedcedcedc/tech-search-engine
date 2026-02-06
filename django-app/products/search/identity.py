from rapidfuzz import fuzz
from products.utils.log.search_engine_log import search_engine_log
import json
import numpy as np
from products.search.config import COSINE_THRESHOLD_CLUSTER, FUZZY_THRESHOLD_CLUSTER
from products.search.utils import cosine_similarity
import numpy as np


def identity_resolution(aggregated):
    merged = []

    while aggregated:
        base = aggregated.pop(0)
        similar = [base]

        # Precompute base info
        base_full_name = f"{base['name']} {base.get('variant', '')}".lower()
        base_emb = None
        if base.get("_embedding"):
            try:
                base_emb = np.array(json.loads(base["_embedding"]))
            except Exception as e:
                search_engine_log(f"Error loading embedding for base {base['id']}: {e}")

        for other in aggregated[:]:
            other_full_name = f"{other['name']} {other.get('variant', '')}".lower()
            other_emb = None
            if other.get("_embedding"):
                try:
                    other_emb = np.array(json.loads(other["_embedding"]))
                except Exception as e:
                    search_engine_log(
                        f"Error loading embedding for other {other['id']}: {e}"
                    )

            # Fuzzy match on full name + variant
            full_name_score = fuzz.ratio(base_full_name, other_full_name)

            # Cosine similarity check if embeddings exist
            cosine_sim = 0.0
            if base_emb is not None and other_emb is not None:
                try:
                    cosine_sim = float(
                        cosine_similarity(
                            base_emb.reshape(1, -1), other_emb.reshape(1, -1)
                        )
                    )
                except Exception as e:
                    search_engine_log(
                        f"Error computing cosine for {base['id']} vs {other['id']}: {e}"
                    )

            # Merge if strong fuzzy match or high cosine similarity
            if (
                full_name_score >= FUZZY_THRESHOLD_CLUSTER
                or cosine_sim >= COSINE_THRESHOLD_CLUSTER
            ):
                similar.append(other)
                aggregated.remove(other)

        # Merge all offers from similar products
        all_offers = [o for s in similar for o in s["offers"]]
        base["offers"] = all_offers
        base["lowest_price"] = min(o["price"] for o in all_offers)
        merged.append(base)

        search_engine_log(
            f"Merged cluster '{base['name']}' with {len(similar)} similar products, offers={len(all_offers)}"
        )

    search_engine_log(f"Identity resolution complete, merged count={len(merged)}")
    return merged
