import math
from rapidfuzz import fuzz
from products.utils.log.search_engine_log import search_engine_log
import json
import numpy as np
from products.search.utils import ascii_folding, cosine_similarity
from openai import OpenAI
import environ

# --- Initialize GPT client ---
env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


def gpt_rerank_top_cluster_items(cluster_items, query, top_n=3, weight=0.05):
    """
    Use GPT to smooth product_score for top items in the cluster.
    weight: how much GPT score affects final product_score
    """
    items_to_rank = cluster_items[:top_n]
    input_list = [
        {"id": i["id"], "name": i["name"], "variant": i.get("variant", "")}
        for i in items_to_rank
    ]

    prompt = f"""
        You are a smart e-commerce assistant. Rank these products by relevance to the query. 
        Return a JSON array with 'id' and 'score' (0.0 to 1.0).

        Query: "{query}"
        Products: {json.dumps(input_list)}
        """

    try:
        resp = client.chat.completions.create(
            model="gpt-5-nano",
            temperature=1,
            messages=[{"role": "user", "content": prompt}],
        )
        output_text = resp.choices[0].message.content.strip()
        gpt_scores = json.loads(output_text)
        score_map = {str(i["id"]): float(i["score"]) for i in gpt_scores}

        # Apply GPT-adjusted scoring
        for item in items_to_rank:
            if str(item["id"]) in score_map:
                item["product_score"] = round(
                    (1 - weight) * item.get("product_score", 0)
                    + weight * score_map[str(item["id"])],
                    4,
                )
        return cluster_items
    except Exception as e:
        search_engine_log(f"GPT rerank failed for query '{query}': {e}")
        return cluster_items


def score_cluster_for_query(aggregated, query: str, query_embedding=None):
    """
    Score product clusters for a given query using hybrid matching:
    - Fuzzy match (name + variant)
    - Brand presence
    - Semantic similarity (query -> product embedding)
    - Price influence (smaller price gives small boost)
    - GPT-5 mini re-ranking (small adjustment)
    """
    query_lower = ascii_folding(query.lower())

    for item in aggregated:
        # --- Fuzzy match ---
        product_text = f"{ascii_folding(item['name'])} {ascii_folding(item.get('variant', ''))}".lower()
        fuzzy_score = fuzz.token_set_ratio(query_lower, product_text) / 100.0

        # --- Brand boost ---
        brand_score = 1.0 if item.get("brand", "").lower() in query_lower else 0.0

        # --- Semantic similarity ---
        semantic_similarity = 0.0
        if query_embedding is not None and item.get("embedding"):
            try:
                product_emb = np.array(json.loads(item["embedding"]))
                semantic_similarity = cosine_similarity(query_embedding, product_emb)
            except Exception as e:
                search_engine_log(
                    f"Error computing semantic similarity for '{item['name']}': {e}"
                )

        # --- Variant boost ---
        variant_score = 0.0
        if item.get("variant"):
            variant_tokens = item["variant"].lower().split()
            variant_hits = sum(1 for t in query_lower.split() if t in variant_tokens)
            variant_score = variant_hits / max(len(query_lower.split()), 1)

        # --- Token overlap ---
        query_tokens = query_lower.split()
        product_tokens = (
            ascii_folding(item["name"]).lower().split()
            + ascii_folding(item.get("variant", "")).lower().split()
        )
        query_token_hits = sum(1 for t in query_tokens if t in product_tokens)
        query_token_score = query_token_hits / max(len(query_tokens), 1)

        # --- Hybrid relevance ---
        relevance = (
            0.4 * fuzzy_score
            + 0.5 * semantic_similarity
            + 0.05 * variant_score
            + 0.01 * brand_score
            + 0.04 * query_token_hits
        )
        item["relevance"] = round(relevance, 4)

        # --- Hybrid product score including price ---
        price_factor = (
            0.5 / math.log(item["lowest_price"] + 2) if item["lowest_price"] > 0 else 0
        )
        item["product_score"] = round(0.9 * relevance + 0.1 * price_factor, 4)

        search_engine_log(
            f"Product '{item['name']}' -> fuzzy={fuzzy_score:.3f}, "
            f"variant={variant_score:.3f}, brand={brand_score:.1f}, "
            f"semantic={semantic_similarity:.4f}, relevance={item['relevance']}"
        )

    # --- GPT-5 mini smoothing ---
    # aggregated = gpt_rerank_top_cluster_items(aggregated, query)

    return aggregated
