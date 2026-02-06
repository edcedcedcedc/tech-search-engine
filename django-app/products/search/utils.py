from collections import deque
import random
import re
from products.utils.log.search_engine_log import search_engine_log
import numpy as np
from openai import OpenAI
import environ


from unidecode import unidecode

import numpy as np

env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


def cosine_similarity(a, b):
    a = np.array(a).flatten()
    b = np.array(b).flatten()
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def normalize_text(text: str) -> str:
    text = text.lower()
    text = unidecode(text)  # remove accents
    text = re.sub(r"[^a-z0-9\s]", " ", text)  # remove punctuation
    text = re.sub(r"\s+", " ", text).strip()  # normalize spaces
    return text


def balanced_offers(offers):
    """
    Reorders offers to avoid long streaks of the same shop.
    - Does NOT change relevance or cluster membership.
    - Preserves all offers.
    - Interleaves shops as much as possible.

    Example: If offers = [Enter, Enter, Darwin, Enter, Darwin]
    The output might be: [Enter, Darwin, Enter, Darwin, Enter]
    """
    # Group offers per shop
    shop_groups = {}
    for o in offers:
        shop_groups.setdefault(o["shop"], deque()).append(o)

    mixed = []
    while any(shop_groups.values()):
        # pick a random shop among those with remaining offers
        available_shops = [s for s, q in shop_groups.items() if q]
        chosen_shop = random.choice(available_shops)
        mixed.append(shop_groups[chosen_shop].popleft())

    return mixed


def translate_query(raw_query: str) -> str:
    """
    Normalize, translate and safely expand a short e-commerce search query
    for semantic search and map it to valid categories.
    """
    categories_cleaned = []
    if not raw_query:
        return raw_query

    try:
        search_engine_log(f"Translating query: '{raw_query}'")

        # Flatten categories for GPT
        categories_words = [cat["ro"] for cat in categories_cleaned]

        resp = client.chat.completions.create(
            model="gpt-5-nano",
            temperature=1,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You normalize short e-commerce product search queries "
                        "and map them to valid categories.\n\n"
                        "Tasks:\n"
                        "1. Translate the query to English if needed.\n"
                        "2. Expand informal slang to standard product terms.\n"
                        "3. Map any recognized product type to categories in this list:\n"
                        f"{', '.join(categories_words)}\n"
                        "4. You can mix multiple categories if appropriate.\n\n"
                        "Rules:\n"
                        "- Output ONE single-line query string.\n"
                        "- Use lowercase.\n"
                        "- Only words separated by spaces.\n"
                        "- Include valid category words whenever possible.\n"
                        "- Do NOT invent new categories.\n"
                        "- Minimal extra words beyond normalization.\n\n"
                        "Examples:\n"
                        "Input: моник новый\n"
                        "Output: monitor display\n"
                        "\n"
                        "Input: кнопочный тел\n"
                        "Output: telefon mobil buton\n"
                        "\n"
                        "Input: айфон 13\n"
                        "Output: iphone 13 smartphone\n"
                    ),
                },
                {"role": "user", "content": raw_query},
            ],
        )

        return resp.choices[0].message.content.strip()

    except Exception as e:
        search_engine_log(f"Query translation failed '{raw_query}': {e}")
        return raw_query
