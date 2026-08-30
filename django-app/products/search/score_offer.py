import math
import re
from rapidfuzz import fuzz
import json
import numpy as np
from products.search.utils import ascii_folding, cosine_similarity
from products.utils.log.search_engine_log import search_engine_log


def is_tv_query(query):
    """Check if query is TV-related"""
    tv_keywords = [
        "tv",
        "televizor",
        "televiziune",
        "televizor",
        "led tv",
        "lcd tv",
        "oled tv",
        "qled tv",
        "smart tv",
        "android tv",
        "tizen",
    ]
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in tv_keywords)


def extract_all_tv_features(text, query=""):
    """Extract ALL possible TV features from text"""
    text_lower = text.lower()
    query_lower = query.lower()

    features = {
        "size": 0,
        "resolution": "unknown",
        "resolution_score": 0,
        "technology": [],
        "smart_features": [],
        "hdr_types": [],
        "refresh_rate": 0,
        "panel_type": "",
        "audio_features": [],
        "connectivity": [],
        "special_features": [],
        "year": 0,
        "brand": "",
        "exact_match_bonus": 0,
    }

    # --- SCREEN SIZES (comprehensive list) ---
    size_patterns = [
        r'(\d{2,3})\s*["“”]',  # 40" or 40"
        r"(\d{2,3})\s*inch",  # 40 inch
        r"(\d{2,3})\s* in ",  # 40 in
        r"(\d{2,3})-inch",  # 40-inch
        r"(\d{2,3})”",  # 40”
        r"(\d{2,3})\s*“",  # 40“
        r"(\d{2,3})\s*inchi",  # 40 inchi (Romanian)
        r"(\d{2,3})\s*de inch",  # 40 de inch
    ]

    # All possible TV sizes (in inches)
    size_categories = {
        "small": [24, 28, 32, 40, 43],
        "medium": [48, 49, 50, 55, 58, 60],
        "large": [65, 70, 75, 77, 82, 85],
        "extra_large": [86, 98, 100, 110, 115, 120],
    }

    # Flatten all sizes
    all_sizes = [size for category in size_categories.values() for size in category]

    for pattern in size_patterns:
        match = re.search(pattern, text_lower)
        if match:
            size = int(match.group(1))
            # Check if it's a valid TV size (between 20 and 150 inches)
            if 20 <= size <= 150:
                features["size"] = size
                # Bonus if size exactly matches common sizes
                if size in all_sizes:
                    features["exact_match_bonus"] += 0.1
                break

    # --- RESOLUTION DETECTION (comprehensive) ---
    resolution_map = {
        # 8K resolutions
        r"8k|8k uhd|8k ultra hd|4320p": {"name": "8K", "score": 3.0},
        r"7680.*4320": {"name": "8K", "score": 3.0},
        # 4K resolutions
        r"4k|4k uhd|ultra hd|uhd|2160p": {"name": "4K", "score": 2.5},
        r"3840.*2160": {"name": "4K", "score": 2.5},
        # 2K / Quad HD
        r"2k|qhd|1440p|2k qhd": {"name": "QHD", "score": 2.2},
        r"2560.*1440": {"name": "QHD", "score": 2.2},
        # Full HD
        r"full hd|fhd|1080p|hd 1080": {"name": "Full HD", "score": 2.0},
        r"1920.*1080": {"name": "Full HD", "score": 2.0},
        # HD Ready
        r"hd ready|720p|1366x768": {"name": "HD Ready", "score": 1.5},
        r"1280.*720": {"name": "HD Ready", "score": 1.5},
        # Standard HD
        r"hd|720p": {"name": "HD", "score": 1.3},
    }

    for pattern, res_info in resolution_map.items():
        if re.search(pattern, text_lower):
            features["resolution"] = res_info["name"]
            features["resolution_score"] = max(
                features["resolution_score"], res_info["score"]
            )
            break

    # --- PANEL TECHNOLOGY ---
    tech_scores = {
        # Premium technologies
        "microled": 2.5,
        "micro led": 2.5,
        "oled": 2.3,
        "oled evo": 2.4,
        "woled": 2.3,
        "qled": 2.2,
        "qd-oled": 2.4,
        "neo qled": 2.3,
        "mini-led": 2.1,
        "mini led": 2.1,
        "nano cell": 2.0,
        "nanocell": 2.0,
        "qned": 2.0,
        # Standard technologies
        "led": 1.5,
        "direct led": 1.6,
        "edge led": 1.4,
        "lcd": 1.3,
        "tft": 1.2,
        "plasma": 1.4,  # older but still relevant
    }

    for tech, score in tech_scores.items():
        if tech in text_lower:
            features["technology"].append(tech)
            if "tech_score" not in features:
                features["tech_score"] = score
            else:
                features["tech_score"] = max(features["tech_score"], score)

    # --- HDR TYPES ---
    hdr_features = {
        "dolby vision": 1.5,
        "dolbyvision": 1.5,
        "hdr10+": 1.4,
        "hdr10 plus": 1.4,
        "hdr10": 1.3,
        "hlg": 1.2,
        "hdr": 1.1,
    }

    for hdr, score in hdr_features.items():
        if hdr in text_lower:
            features["hdr_types"].append(hdr)
            if "hdr_score" not in features:
                features["hdr_score"] = score
            else:
                features["hdr_score"] = max(features["hdr_score"], score)

    # --- SMART TV PLATFORMS ---
    smart_platforms = {
        "webos": "LG",
        "tizen": "Samsung",
        "android tv": "Android",
        "google tv": "Google",
        "roku": "Roku",
        "fire tv": "Amazon",
        "hisense vidaa": "VIDAA",
        "panasonic my home screen": "Panasonic",
        "sony android": "Android",
        "smart tv": "Generic",
    }

    for platform, manufacturer in smart_platforms.items():
        if platform in text_lower:
            features["smart_features"].append(platform)

    # --- REFRESH RATE ---
    refresh_patterns = [
        r"(\d{3})\s*Hz",  # 120Hz, 240Hz
        r"(\d{2,3})\s*hz",
        r"(\d{2,3})\s*hert(z|s)",
        r"(\d{2,3})\s*frame rate",
    ]

    for pattern in refresh_patterns:
        match = re.search(pattern, text_lower)
        if match:
            features["refresh_rate"] = int(match.group(1))
            break

    # --- AUDIO FEATURES ---
    audio_features = [
        "dolby atmos",
        "dts:x",
        "dts virtual x",
        "soundbar",
        "subwoofer",
        "2.1 channel",
        "5.1 channel",
        "7.1 channel",
        "object tracking sound",
        "ots",
        "ai sound",
        "adaptive sound",
    ]

    for audio in audio_features:
        if audio in text_lower:
            features["audio_features"].append(audio)

    # --- CONNECTIVITY ---
    connectivity_features = [
        "hdmi 2.1",
        "hdmi 2.0",
        "hdmi arc",
        "hdmi earc",
        "usb 3.0",
        "usb-c",
        "bluetooth 5.0",
        "wifi 6",
        "airplay",
        "chromecast",
        "miracast",
        "dlna",
    ]

    for conn in connectivity_features:
        if conn in text_lower:
            features["connectivity"].append(conn)

    # --- SPECIAL FEATURES ---
    special_features = [
        "ambient mode",
        "art mode",
        "gallery mode",
        "motion smoothing",
        "tru motion",
        "motion plus",
        "game mode",
        "game optimizer",
        "variable refresh rate",
        "vrr",
        "free sync",
        "g-sync",
        "auto low latency",
        "filmmaker mode",
        "calman ready",
    ]

    for special in special_features:
        if special in text_lower:
            features["special_features"].append(special)

    # --- MANUFACTURING YEAR ---
    year_patterns = [
        r"(\d{4})\s*(model|series|tv)",
        r"model\s*(\d{4})",
        r"(\d{4})\s*edition",
    ]

    current_year = 2026
    for pattern in year_patterns:
        match = re.search(pattern, text_lower)
        if match:
            year = int(match.group(1))
            if 2015 <= year <= current_year:
                features["year"] = year
                # Newer models get bonus
                features["year_bonus"] = (year - 2015) / 10

    # --- BRAND RECOGNITION ---
    brands = [
        "samsung",
        "lg",
        "sony",
        "panasonic",
        "philips",
        "toshiba",
        "hisense",
        "tcl",
        "sharp",
        "vizio",
        "xiaomi",
        "mi",
        "pioneer",
        "jvc",
        "hitachi",
        "loewe",
        "bang olufsen",
        "grundig",
        "vestel",
    ]

    for brand in brands:
        if brand in text_lower:
            features["brand"] = brand
            # Bonus if brand matches query
            if brand in query_lower:
                features["exact_match_bonus"] += 0.15
            break

    # --- QUERY MATCH BONUSES ---
    if features["size"] > 0:
        # Check if query mentions exact size
        size_str = str(features["size"])
        if size_str in query_lower or f"{size_str} inch" in query_lower:
            features["exact_match_bonus"] += 0.2

        # Check for size category match
        if "small" in query_lower and features["size"] in size_categories["small"]:
            features["exact_match_bonus"] += 0.1
        elif "medium" in query_lower and features["size"] in size_categories["medium"]:
            features["exact_match_bonus"] += 0.1
        elif "large" in query_lower and features["size"] in size_categories["large"]:
            features["exact_match_bonus"] += 0.1

    return features


def calculate_tv_relevance_score(offer_features, product_features, query):
    """Calculate comprehensive TV relevance score"""
    score = 0.0
    weights = {
        "size": 0.30,
        "resolution": 0.20,
        "technology": 0.15,
        "hdr": 0.10,
        "smart_features": 0.08,
        "refresh_rate": 0.07,
        "audio": 0.05,
        "year": 0.05,
    }

    # --- SIZE SCORING (30%) ---
    if offer_features["size"] > 0:
        size = offer_features["size"]

        # Popular size categories with scores
        if 40 <= size <= 43:
            size_score = 0.85
        elif 44 <= size <= 49:
            size_score = 0.9
        elif 50 <= size <= 55:
            size_score = 1.0  # Most popular range
        elif 56 <= size <= 60:
            size_score = 0.95
        elif 61 <= size <= 65:
            size_score = 0.9
        elif 66 <= size <= 75:
            size_score = 0.85
        elif 76 <= size <= 85:
            size_score = 0.8
        elif size > 85:
            size_score = 0.75
        else:
            size_score = 0.5

        # Bonus for exact size match in query
        query_lower = query.lower()
        if str(size) in query_lower:
            size_score = min(size_score * 1.3, 1.0)

        score += size_score * weights["size"]

    # --- RESOLUTION SCORING (20%) ---
    score += offer_features.get("resolution_score", 1.0) * weights["resolution"]

    # --- TECHNOLOGY SCORING (15%) ---
    tech_score = offer_features.get("tech_score", 1.0)
    # Bonus for OLED/QD-OLED in high-end queries
    if "premium" in query.lower() or "high end" in query.lower():
        if "oled" in offer_features["technology"]:
            tech_score *= 1.2
    score += min(tech_score, 2.0) * weights["technology"]

    # --- HDR SCORING (10%) ---
    hdr_score = offer_features.get("hdr_score", 0.8)
    # Bonus for Dolby Vision in premium queries
    if (
        "dolby vision" in query.lower()
        and "dolby vision" in offer_features["hdr_types"]
    ):
        hdr_score = min(hdr_score * 1.2, 1.5)
    score += min(hdr_score, 1.5) * weights["hdr"]

    # --- SMART FEATURES (8%) ---
    if offer_features["smart_features"]:
        smart_score = 0.8 + (len(offer_features["smart_features"]) * 0.1)
        score += min(smart_score, 1.2) * weights["smart_features"]

    # --- REFRESH RATE (7%) ---
    if offer_features["refresh_rate"] > 0:
        if offer_features["refresh_rate"] >= 120:
            refresh_score = 1.0
        elif offer_features["refresh_rate"] >= 100:
            refresh_score = 0.9
        elif offer_features["refresh_rate"] >= 60:
            refresh_score = 0.7
        else:
            refresh_score = 0.5

        # Bonus for gaming queries
        if "gaming" in query.lower() or "game" in query.lower():
            if offer_features["refresh_rate"] >= 120:
                refresh_score = min(refresh_score * 1.2, 1.0)

        score += refresh_score * weights["refresh_rate"]

    # --- AUDIO FEATURES (5%) ---
    if offer_features["audio_features"]:
        audio_score = 0.7 + (len(offer_features["audio_features"]) * 0.1)
        score += min(audio_score, 1.1) * weights["audio"]

    # --- YEAR BONUS (5%) ---
    year_bonus = offer_features.get("year_bonus", 0)
    score += min(year_bonus, 0.5) * weights["year"]

    # --- EXACT MATCH BONUSES ---
    exact_match_bonus = offer_features.get("exact_match_bonus", 0)
    score = min(score + exact_match_bonus * 0.1, 1.0)

    return score


def score_offers_for_product(product):
    min_price = product["lowest_price"]
    product_relevance = product.get("relevance", 0)
    raw_query = product.get("query", "")

    # Check if this is a TV query
    is_tv = is_tv_query(raw_query)
    if is_tv:
        search_engine_log(f"[TV Mode] TV-related query detected: '{raw_query}'")

    # --- Prepare cluster embedding ---
    try:
        product_emb = (
            np.array(json.loads(product["embedding"]))
            if product.get("embedding")
            else None
        )
    except Exception as e:
        product_emb = None
        search_engine_log(f"[EmbeddingError] Failed to load product embedding: {e}")

    # --- Prepare query embedding ---
    try:
        query_emb = (
            np.array(json.loads(product["query_embedding"]))
            if product.get("query_embedding")
            else None
        )
    except Exception as e:
        query_emb = None
        search_engine_log(f"[EmbeddingError] Failed to load query embedding: {e}")

    shop_seen = set()

    # For TV queries, pre-process product features
    product_tv_features = None
    if is_tv:
        product_tv_features = extract_all_tv_features(
            product.get("name", ""), raw_query
        )

    for o in product["offers"]:
        if not o["in_stock"]:
            o["offer_score"] = 0.0
            continue

        # --- Load offer embedding ---
        offer_emb = None
        if o.get("embedding"):
            try:
                if o["embedding"].strip() == "":
                    offer_emb = None
                else:
                    offer_emb = np.array(json.loads(o["embedding"]))
            except Exception as e:
                search_engine_log(
                    f"[OfferEmbeddingError] Offer '{o['name']}' failed to load embedding: {e}"
                )
                offer_emb = None

        # --- Identity match (fuzzy) with product ---
        name_score = (
            fuzz.token_set_ratio(
                ascii_folding(o["name"].lower()), ascii_folding(product["name"].lower())
            )
            / 100
        )
        variant_score = (
            fuzz.token_set_ratio(
                ascii_folding((o.get("variant") or "").lower()),
                ascii_folding((product.get("variant") or "").lower()),
            )
            / 100
        )
        identity_score = 0.7 * name_score + 0.3 * variant_score

        # --- Identity match (fuzzy) with query ---
        query_name_score = (
            fuzz.token_set_ratio(
                ascii_folding(o["name"].lower()), ascii_folding(raw_query.lower())
            )
            / 100
        )
        query_variant_score = (
            fuzz.token_set_ratio(
                ascii_folding((o.get("variant") or "").lower()),
                ascii_folding(raw_query.lower()),
            )
            / 100
        )
        query_identity_score = 0.7 * query_name_score + 0.3 * query_variant_score

        # --- Semantic similarity ---
        semantic_score = 0.0
        if product_emb is not None and offer_emb is not None:
            try:
                semantic_score = cosine_similarity(product_emb, offer_emb)
            except Exception as e:
                search_engine_log(
                    f"[SemanticError] Offer '{o['name']}' failed cluster semantic: {e}"
                )

        query_semantic = 0.0
        if query_emb is not None and offer_emb is not None:
            try:
                query_semantic = cosine_similarity(query_emb, offer_emb)
            except Exception as e:
                search_engine_log(
                    f"[SemanticError] Offer '{o['name']}' failed query semantic: {e}"
                )

        # --- TV-specific comprehensive ranking ---
        tv_relevance_score = 0.0
        tv_features_log = ""

        if is_tv:
            offer_features = extract_all_tv_features(
                f"{o['name']} {o.get('variant', '')} {product.get('name', '')}",
                raw_query,
            )
            tv_relevance_score = calculate_tv_relevance_score(
                offer_features, product_tv_features, raw_query
            )

            # Create detailed log of TV features
            tv_features_log = (
                f"Size:{offer_features['size']}\" | "
                f"Res:{offer_features['resolution']} | "
                f"Tech:{offer_features['technology'][:2]} | "
                f"HDR:{offer_features['hdr_types'][:2]} | "
                f"Hz:{offer_features['refresh_rate']} | "
                f"Smart:{len(offer_features['smart_features'])} | "
                f"Year:{offer_features['year']}"
            )

            search_engine_log(
                f"[TV Details] Offer '{o['name']}' | {tv_features_log} | TV Score:{tv_relevance_score:.3f}"
            )

        # --- Price factor ---
        if o["price"] > 0 and min_price > 0:
            price_score = 1 / math.log(o["price"] / min_price + 1.1)
            price_score = min(price_score, 1.0)
        else:
            price_score = 0.0

        # --- Shop diversity factor ---
        diversity_factor = 0.9 if o["shop"] in shop_seen else 1.0
        shop_seen.add(o["shop"])

        # --- Dynamic weight adjustment based on query specificity ---
        if is_tv and tv_relevance_score > 0:
            # Check if query has specific TV requirements
            query_lower = raw_query.lower()

            # Adjust weights based on query specificity
            size_weight = 0.30 if any(c.isdigit() for c in query_lower) else 0.25
            res_weight = (
                0.20
                if any(res in query_lower for res in ["4k", "8k", "uhd", "hd"])
                else 0.15
            )

            # Recalculate with dynamic weights
            final_score = round(
                (
                    0.03 * identity_score
                    + 0.25 * query_identity_score
                    + 0.10 * semantic_score
                    + 0.07 * query_semantic
                    + (size_weight + res_weight)
                    * tv_relevance_score  # TV features get 35-50% weight
                    + 0.04 * product_relevance
                    + 0.01 * price_score
                )
                * diversity_factor,
                4,
            )

            search_engine_log(
                f"[TV Final] {tv_features_log} | TV:{tv_relevance_score:.3f} | Final:{final_score}"
            )
        else:
            # Standard scoring for non-TV queries
            final_score = round(
                (
                    0.05 * identity_score
                    + 0.55 * query_identity_score
                    + 0.20 * semantic_score
                    + 0.15 * query_semantic
                    + 0.04 * product_relevance
                    + 0.01 * price_score
                )
                * diversity_factor,
                4,
            )

        o["offer_score"] = final_score
