from functools import cached_property
import math
import time
from django.shortcuts import render
from requests import request
from rest_framework.views import APIView
from rest_framework.response import Response
from products.models import Product
from rapidfuzz import process, fuzz
from django.db.models import Q
import traceback
from rest_framework.throttling import ScopedRateThrottle
from products.throttles import (
    AutocompleteThrottle,
    Layer1Throttle,
    Layer2PreviewThrottle,
    Layer2FullThrottle,
)
import hashlib
import random
from collections import deque
from products.utils.search_engine_log import search_engine_log
from products.utils.search_engine_autocomplete_log import autocomplete_log
from products.utils.precompute_embeddings_from_query_log import (
    embeddings_from_query_log,
)
from products.utils.generate_canonical_id import generate_canonical_id
import json
import numpy as np
from products.models import UserQueryEmbedding, PrecomputedSimilarity
from openai import OpenAI
import environ
import re
from products.utils import embeddings_cache
from unidecode import unidecode

import numpy as np

FUZZY_THRESHOLD_CLUSTER = 85
#  FUZZY_THRESHOLD_AUTOCOMPLETE = 50
AUTOCOMPLETE_LIMIT = 10
LAYER1_LIMIT = 20
LAYER2_LIMIT = 10
LAYER3_LIMIT = 10


env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
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


# ---------------- Layer 1: Search / Product Frames ----------------
class SearchAPIView(APIView):
    throttle_classes = [Layer1Throttle]

    def get(self, request):
        try:
            raw_query = request.GET.get("q", "").strip()
            query_embedding = self.get_query_embedding(raw_query)
            search_engine_log(f"Received raw query: '{raw_query}'")

            limit = min(int(request.GET.get("limit", LAYER1_LIMIT)), LAYER1_LIMIT)
            cursor = request.GET.get("cursor")
            offset = int(cursor) if cursor and cursor.isdigit() else 0

            if not raw_query or query_embedding is None:
                request.session["aggregated_cache"] = None
                return Response({"products": [], "next_cursor": None})

            # ----------------------
            # Semantic retrieval step
            # ----------------------
            top_products = self.semantic_filter_products(query_embedding)

            aggregated = self.aggregate_products(top_products)

            # Identity resolution & relevance scoring
            aggregated = self.identity_resolution(aggregated)
            aggregated = self.score_relevance(aggregated, raw_query, query_embedding)

            # Sort by product_score descending
            aggregated.sort(key=lambda x: -x.get("product_score", x["relevance"]))

            # --- Slice using index-based cursor ---
            aggregated_slice = aggregated[offset : offset + limit]

            # Save full sorted aggregated cache in session for Layer2
            request.session["aggregated_cache"] = aggregated

            probabilistic_clusters = [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "brand": p["brand"],
                    "category": p["category"],
                    "variant": p["variant"],
                    "lowest_price": p["lowest_price"],
                    "offers": len(p["offers"]),
                    "relevance": p["relevance"],
                    "product_score": p["product_score"],
                    "image": p["image"],
                    "t_name": p.get("t_name", {}),
                    "t_variant": p.get("t_variant", {}),
                    "shops": p.get("shops", []),
                }
                for p in aggregated_slice
            ]

            next_cursor = self.get_next_cursor(aggregated, limit, offset=offset)
            return Response(
                {"products": probabilistic_clusters, "next_cursor": next_cursor}
            )

        except Exception as e:
            trace = traceback.format_exc()
            search_engine_log(f"Error in SearchAPIView: {e}\n{trace}")
            return Response({"error": "Internal server error"}, status=500)

    def get_query_embedding(self, raw_query: str):
        """Get query embedding from DB or generate it if missing."""

        uq = UserQueryEmbedding.objects.filter(query_text=raw_query).first()
        if uq and uq.embedding:
            return np.array(json.loads(uq.embedding))

        # If not cached, generate embedding
        try:
            search_engine_log(f"Generating live embedding '{raw_query}'")
            resp = client.embeddings.create(
                model="text-embedding-3-small", input=raw_query
            )
            query_embedding = np.array(resp.data[0].embedding)

            if not uq:
                UserQueryEmbedding.objects.create(
                    query_text=raw_query,
                    embedding=json.dumps(query_embedding.tolist()),
                )

            return query_embedding

        except Exception as e:
            search_engine_log(
                f"Failed to generate embedding for query '{raw_query}': {e}"
            )
            return None

    def translate_query(self, raw_query: str) -> str:
        """
        Normalize, translate and safely expand a short e-commerce search query
        for semantic search and map it to valid categories.
        """
        categories_cleaned = [
            {
                "ro": "accesorii apple",
                "en": "Apple accessories",
                "ru": "аксессуары Apple",
            },
            {
                "ro": "accesorii gaming",
                "en": "Gaming accessories",
                "ru": "геймерские аксессуары",
            },
            {
                "ro": "accesorii tableta",
                "en": "Tablet accessories",
                "ru": "аксессуары для планшетов",
            },
            {
                "ro": "accesorii tv",
                "en": "TV accessories",
                "ru": "аксессуары для телевизоров",
            },
            {
                "ro": "aspirator robot",
                "en": "Robot vacuum cleaners",
                "ru": "роботы-пылесосы",
            },
            {
                "ro": "birou calculator, mobilier",
                "en": "Computer desks and furniture",
                "ru": "компьютерные столы и мебель",
            },
            {
                "ro": "birou, mobilier",
                "en": "Office desks and furniture",
                "ru": "офисные столы и мебель",
            },
            {
                "ro": "cabluri, accesorii",
                "en": "Cables and accessories",
                "ru": "кабели и аксессуары",
            },
            {"ro": "camera actiune", "en": "Action cameras", "ru": "экшн-камеры"},
            {
                "ro": "camera web, periferice pc",
                "en": "Webcams and PC peripherals",
                "ru": "веб-камеры и периферия для ПК",
            },
            {
                "ro": "cană, accesorii birou",
                "en": "Mugs and desk accessories",
                "ru": "кружки и офисные аксессуары",
            },
            {
                "ro": "carcasa pc, componente pc",
                "en": "PC cases and components",
                "ru": "корпуса и компоненты ПК",
            },
            {
                "ro": "casti gaming, audio",
                "en": "Gaming headsets and audio",
                "ru": "геймерские наушники и аудио",
            },
            {
                "ro": "casti, audio",
                "en": "Headphones and audio",
                "ru": "наушники и аудио",
            },
            {"ro": "console jocuri", "en": "Game consoles", "ru": "игровые консоли"},
            {
                "ro": "consumabile imprimanta",
                "en": "Printer consumables",
                "ru": "расходные материалы для принтеров",
            },
            {
                "ro": "controller jocuri, accesorii gaming",
                "en": "Game controllers and gaming accessories",
                "ru": "геймпады и игровые аксессуары",
            },
            {
                "ro": "docking station, accesorii pc",
                "en": "Docking stations and PC accessories",
                "ru": "док-станции и аксессуары для ПК",
            },
            {
                "ro": "ecrane proiectie",
                "en": "Projection screens",
                "ru": "проекционные экраны",
            },
            {
                "ro": "imprimanta, birou",
                "en": "Printers and office equipment",
                "ru": "принтеры и офисное оборудование",
            },
            {
                "ro": "incarcatoare, accesorii mobile",
                "en": "Chargers and mobile accessories",
                "ru": "зарядные устройства и мобильные аксессуары",
            },
            {"ro": "jocuri video", "en": "Video games", "ru": "видеоигры"},
            {
                "ro": "lampa birou, iluminat",
                "en": "Desk lamps and lighting",
                "ru": "настольные лампы и освещение",
            },
            {
                "ro": "laptop accessories",
                "en": "Laptop accessories",
                "ru": "аксессуары для ноутбуков",
            },
            {
                "ro": "laptop gaming, notebook gaming",
                "en": "Gaming laptops",
                "ru": "игровые ноутбуки",
            },
            {
                "ro": "laptop, notebook",
                "en": "Laptops and notebooks",
                "ru": "ноутбуки и портативные компьютеры",
            },
            {"ro": "media player", "en": "Media players", "ru": "медиаплееры"},
            {
                "ro": "memorie ram, componente pc",
                "en": "RAM and PC components",
                "ru": "оперативная память и компоненты ПК",
            },
            {
                "ro": "merchandising, fan gear",
                "en": "Merchandising and fan gear",
                "ru": "мерчандайзинг и фанатская атрибутика",
            },
            {
                "ro": "merchandising, gaming",
                "en": "Gaming merchandising",
                "ru": "геймерский мерчандайзинг",
            },
            {
                "ro": "microfon gaming, audio",
                "en": "Gaming microphones and audio",
                "ru": "геймерские микрофоны и аудио",
            },
            {
                "ro": "microfon, audio",
                "en": "Microphones and audio",
                "ru": "микрофоны и аудио",
            },
            {"ro": "mini pc, apple", "en": "Apple Mac mini", "ru": "мини-ПК Apple"},
            {
                "ro": "mini pc, desktop",
                "en": "Mini PCs",
                "ru": "мини-ПК и настольные компьютеры",
            },
            {
                "ro": "monitor gaming, display",
                "en": "Gaming monitors",
                "ru": "игровые мониторы",
            },
            {
                "ro": "monitor, display",
                "en": "Monitors and displays",
                "ru": "мониторы и дисплеи",
            },
            {
                "ro": "mouse gaming, periferice pc",
                "en": "Gaming mice and PC peripherals",
                "ru": "геймерские мыши и периферия для ПК",
            },
            {
                "ro": "mouse pad gaming, accesorii pc",
                "en": "Gaming mouse pads and PC accessories",
                "ru": "геймерские коврики и аксессуары для ПК",
            },
            {
                "ro": "mouse pad, accesorii pc",
                "en": "Mouse pads and PC accessories",
                "ru": "коврики для мыши и аксессуары для ПК",
            },
            {
                "ro": "mouse, periferice pc",
                "en": "Mice and PC peripherals",
                "ru": "компьютерные мыши и периферия для ПК",
            },
            {"ro": "pc all in one, apple", "en": "Apple iMac", "ru": "моноблоки Apple"},
            {
                "ro": "pc all in one, desktop",
                "en": "All-in-One PCs",
                "ru": "моноблоки и настольные компьютеры",
            },
            {
                "ro": "pc desktop, apple",
                "en": "Apple Mac Studio",
                "ru": "настольные компьютеры Apple",
            },
            {
                "ro": "pc desktop, sistem complet",
                "en": "Desktop PCs, complete systems",
                "ru": "настольные ПК, готовые системы",
            },
            {
                "ro": "pc gaming, desktop gaming",
                "en": "Gaming desktop PCs",
                "ru": "игровые ПК и гейминг-компьютеры",
            },
            {
                "ro": "periferice pc",
                "en": "PC peripherals",
                "ru": "периферийные устройства для ПК",
            },
            {
                "ro": "placa de baza, motherboard, componente pc",
                "en": "Motherboards and PC components",
                "ru": "материнские платы и компоненты ПК",
            },
            {
                "ro": "placa video, gpu, componente pc",
                "en": "Graphics cards and PC components",
                "ru": "видеокарты и компоненты ПК",
            },
            {
                "ro": "power bank, accesorii mobile",
                "en": "Power banks and mobile accessories",
                "ru": "пауэрбанки и мобильные аксессуары",
            },
            {
                "ro": "procesor, cpu, componente pc",
                "en": "Processors and PC components",
                "ru": "процессоры и компоненты ПК",
            },
            {
                "ro": "proiectoare, display",
                "en": "Projectors and displays",
                "ru": "проекционные устройства и дисплеи",
            },
            {
                "ro": "protectie retea, birou",
                "en": "Network protection and office",
                "ru": "защита сети и офис",
            },
            {
                "ro": "protectie telefon, accesorii mobile",
                "en": "Phone protection and mobile accessories",
                "ru": "защита телефона и мобильные аксессуары",
            },
            {
                "ro": "racire pc, accesorii",
                "en": "PC cooling and accessories",
                "ru": "охлаждение ПК и аксессуары",
            },
            {
                "ro": "racire pc, cooler, componente pc",
                "en": "PC cooling, coolers and components",
                "ru": "охлаждение ПК, кулеры и компоненты",
            },
            {
                "ro": "router, dispozitiv retea",
                "en": "Routers and network devices",
                "ru": "роутеры и сетевые устройства",
            },
            {
                "ro": "router, wifi, dispozitiv retea",
                "en": "WiFi routers and network devices",
                "ru": "WiFi роутеры и сетевые устройства",
            },
            {
                "ro": "scanner, birou",
                "en": "Scanners and office",
                "ru": "сканеры и офис",
            },
            {
                "ro": "scaun birou, mobilier",
                "en": "Office chairs",
                "ru": "офисные кресла",
            },
            {
                "ro": "scaun gaming, mobilier birou",
                "en": "Gaming chairs",
                "ru": "геймерские кресла",
            },
            {
                "ro": "shredder, birou",
                "en": "Office shredders",
                "ru": "офисные шредеры",
            },
            {"ro": "smartphone, telefon mobil", "en": "Smartphones", "ru": "смартфоны"},
            {"ro": "smartwatch", "en": "Smartwatches", "ru": "умные часы"},
            {"ro": "software", "en": "Software", "ru": "ПО"},
            {
                "ro": "sticlă apă, accesorii birou",
                "en": "Water bottles and desk accessories",
                "ru": "бутылки для воды и офисные аксессуары",
            },
            {
                "ro": "stocare externa, hdd, accesorii pc",
                "en": "External storage and PC accessories",
                "ru": "внешнее хранилище и аксессуары ПК",
            },
            {
                "ro": "stocare interna, hdd, componente pc",
                "en": "Internal HDD storage",
                "ru": "внутренние HDD и компоненты ПК",
            },
            {
                "ro": "stocare interna, ssd, componente pc",
                "en": "Internal SSD storage",
                "ru": "внутренние SSD и компоненты ПК",
            },
            {
                "ro": "stocare interna, ssd, hdd, componente pc",
                "en": "Internal SSD/HDD storage",
                "ru": "внутренние SSD/HDD и компоненты ПК",
            },
            {
                "ro": "suport auto telefon, accesorii auto",
                "en": "Car phone holders and accessories",
                "ru": "автомобильные держатели и аксессуары",
            },
            {
                "ro": "suport monitor, accesorii birou",
                "en": "Monitor stands and desk accessories",
                "ru": "подставки для мониторов и офисные аксессуары",
            },
            {
                "ro": "suport tv, accesorii tv",
                "en": "TV stands and accessories",
                "ru": "подставки для ТВ и аксессуары",
            },
            {
                "ro": "sursa pc, psu, componente pc",
                "en": "PC power supplies and components",
                "ru": "блоки питания ПК и компоненты",
            },
            {
                "ro": "switch, poe, dispozitiv retea",
                "en": "Switches, PoE, network devices",
                "ru": "коммутаторы, PoE и сетевые устройства",
            },
            {"ro": "tableta", "en": "Tablets", "ru": "планшеты"},
            {
                "ro": "tableta grafica",
                "en": "Graphics tablets",
                "ru": "графические планшеты",
            },
            {
                "ro": "tableta grafica, periferice pc",
                "en": "Graphics tablets and PC peripherals",
                "ru": "графические планшеты и периферия ПК",
            },
            {
                "ro": "tastatura gaming, periferice pc",
                "en": "Gaming keyboards and PC peripherals",
                "ru": "геймерские клавиатуры и периферия ПК",
            },
            {
                "ro": "tastatura, periferice pc",
                "en": "Keyboards and PC peripherals",
                "ru": "клавиатуры и периферия ПК",
            },
            {
                "ro": "telefon fix, dect, birou",
                "en": "Landline phones and office",
                "ru": "стационарные телефоны и офис",
            },
            {
                "ro": "telefon mobil, buton, feature phone",
                "en": "Feature phones",
                "ru": "кнопочные телефоны",
            },
            {"ro": "televizor", "en": "Televisions", "ru": "телевизоры"},
        ]
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

    def semantic_filter_products(self, query_embedding, top_n=1000):
        """Retrieve top products by cosine similarity using preloaded embeddings.
        Only considers in-stock products to prevent polluting top results.
        """

        waited = 0
        while embeddings_cache.PRODUCT_EMBEDDINGS is None and waited < 5:
            time.sleep(0.1)
            waited += 0.1

        if (
            embeddings_cache.PRODUCT_EMBEDDINGS is None
            or embeddings_cache.PRODUCT_IDS is None
        ):
            search_engine_log("Warning: embedding cache not loaded yet!")
            return []

        query_vec = np.array(query_embedding, dtype=np.float32)
        query_norm = np.linalg.norm(query_vec)
        search_engine_log(f"Query vector norm: {query_norm}")

        # --- Step 1: Filter to in-stock IDs only ---
        in_stock_ids = set(
            Product.objects.filter(in_stock=True).values_list("id", flat=True)
        )
        in_stock_mask = np.isin(embeddings_cache.PRODUCT_IDS, list(in_stock_ids))

        filtered_embeddings = embeddings_cache.PRODUCT_EMBEDDINGS[in_stock_mask]
        filtered_ids = embeddings_cache.PRODUCT_IDS[in_stock_mask]

        if len(filtered_ids) == 0:
            search_engine_log("No in-stock products available for semantic search.")
            return []

        # --- Step 2: Compute cosine similarity ---
        sims = np.dot(filtered_embeddings, query_vec) / (
            embeddings_cache.EMBEDDINGS_NORM[in_stock_mask] * query_norm + 1e-8
        )

        top_idx = np.argsort(-sims)[:top_n]  # descending
        top_product_ids = filtered_ids[top_idx]

        search_engine_log(
            f"Top {top_n} in-stock product IDs (first 10): {top_product_ids[:10].tolist()}"
        )

        # --- Step 3: Fetch Product objects from DB ---
        products_qs = Product.objects.filter(id__in=top_product_ids)
        search_engine_log(f"Products fetched from DB: {products_qs.count()}")

        products_dict = {p.id: p for p in products_qs}

        # --- Step 4: Maintain original top-N order ---
        top_products = [products_dict[i] for i in top_product_ids if i in products_dict]
        search_engine_log(
            f"Top products returned (first 10 names): {[p.name for p in top_products[:10]]}"
        )

        return top_products

    def tokenize_query(self, query):
        tokens = query.split()
        search_engine_log(f"Tokenizing query '{query}' -> {tokens}")
        return tokens

    def filter_products_by_tokens(self, tokens):
        """
        Filters products by searching in name and variant fields.
        Each token is matched against words in name and variant separately.
        """
        qs = Product.objects.all()

        for t in tokens:
            # match token t anywhere in the name OR anywhere in variant
            qs = qs.filter(
                Q(name__icontains=t)
                | Q(variant__icontains=t)
                | Q(category__icontains=t)
            )
        search_engine_log(f"Filtered products by tokens {tokens}, count={qs.count()}")
        return qs.distinct()

    def aggregate_products(self, qs):
        product_dict = {}

        for p in qs:
            cluster_key = p.canonical_id
            product_dict.setdefault(cluster_key, []).append(p)
            search_engine_log(
                f"Adding product '{p.name} / {p.variant}' to cluster {cluster_key}"
            )
        return [
            self.build_aggregated_product(cluster_id, offers)
            for cluster_id, offers in product_dict.items()
        ]

    def build_aggregated_product(self, cluster_id, offers):
        rep = offers[0]
        unique_shops = sorted({o.shop for o in offers})
        return {
            "id": cluster_id,
            "name": rep.name,
            "variant": rep.variant,
            "t_name": rep.t_name or {},
            "t_variant": rep.t_variant or {},
            "brand": rep.brand,
            "category": rep.category,
            "offers": [
                {
                    "id": o.id,
                    "name": o.name,
                    "variant": o.variant,
                    "t_name": o.t_name or {},
                    "t_variant": o.t_variant or {},
                    "shop": o.shop,
                    "price": o.price,
                    "brand": o.brand,
                    "url": o.url,
                    "external_id": o.external_id,
                    "in_stock": o.in_stock,
                }
                for o in offers
            ],
            "lowest_price": min(o.price for o in offers),
            "shops": unique_shops,
            "embedding": rep.embedding,
            "image": rep.image or "",
        }

    def identity_resolution(self, aggregated):
        merged = []

        while aggregated:
            base = aggregated.pop(0)
            similar = [base]

            # Precompute base info
            base_full_name = f"{base['name']} {base.get('variant','')}".lower()
            base_urls = {o["url"] for o in base["offers"] if o.get("url")}
            base_ids = {
                o["external_id"] for o in base["offers"] if o.get("external_id")
            }

            for other in aggregated[:]:
                other_full_name = f"{other['name']} {other.get('variant','')}".lower()
                other_urls = {o["url"] for o in other["offers"] if o.get("url")}
                other_ids = {
                    o["external_id"] for o in other["offers"] if o.get("external_id")
                }

                # Strict fuzzy match on full name + variant
                full_name_score = fuzz.ratio(base_full_name, other_full_name)

                # Merge if URL overlap, external_id overlap, or strict fuzzy match
                if (
                    base_urls.intersection(other_urls)
                    or base_ids.intersection(other_ids)
                    or full_name_score >= FUZZY_THRESHOLD_CLUSTER
                ):
                    similar.append(other)
                    aggregated.remove(other)

            # Merge all offers from similar products
            all_offers = [o for s in similar for o in s["offers"]]

            base["offers"] = all_offers  # was balaced offers
            base["lowest_price"] = min(o["price"] for o in all_offers)

            merged.append(base)
            search_engine_log(
                f"Merged cluster '{base['name']}' with {len(similar)} similar products, offers={len(all_offers)}"
            )

        search_engine_log(f"Identity resolution complete, merged count={len(merged)}")
        return merged

    def score_relevance(self, aggregated, query: str, query_embedding=None):
        query = query.lower()
        query_tokens = query.split()
        for item in aggregated:
            # fuzzy match
            text = f"{item['name']} {item.get('variant', '')}".lower()
            fuzzy_score = fuzz.token_set_ratio(query, text)
            token_hits = sum(1 for t in query_tokens if t in text)
            token_coverage = token_hits / max(len(query_tokens), 1)
            brand_score = 1.0 if item.get("brand", "").lower() in query else 0.0

            # semantic match
            semantic_similarity = 0.0
            if query_embedding is not None and item.get("embedding"):
                try:
                    product_emb = np.array(json.loads(item["embedding"]))
                    semantic_similarity = cosine_similarity(
                        query_embedding, product_emb
                    )
                except Exception as e:
                    search_engine_log(f"Error computing semantic similarity: {e}")

            relevance = (
                0.55 * (fuzzy_score / 100)
                + 0.25 * token_coverage
                + 0.1 * brand_score
                + 0.1 * semantic_similarity  # add semantic boost
            )
            item["relevance"] = round(relevance, 4)
            # --- new hybrid score including price influence ---
            # protect against price=0
            price_factor = 0.5 / math.log(
                item["lowest_price"] + 2
            )  # +2 to avoid log(0) or very cheap anomalies
            item["product_score"] = round(0.9 * relevance + 0.1 * price_factor, 4)

            search_engine_log(
                f"Product '{item['name']}' -> fuzzy={fuzzy_score}, "
                f"token_cov={token_coverage:.2f}, brand={brand_score}, "
                f"semantic={semantic_similarity:.4f}, relevance={item['relevance']}"
            )
        return aggregated

    def apply_cursor(self, aggregated, cursor):
        try:
            offset = int(cursor)
            return aggregated[offset:]
        except (ValueError, TypeError):
            return aggregated

    def get_next_cursor(self, aggregated, limit, offset=0):
        next_offset = offset + limit
        if next_offset < len(aggregated):
            return str(next_offset)
        return None


# ---------------- Layer 2: Offers (Preview / Full) ----------------
class ProductOffersAPIView(SearchAPIView):
    """
    Inherits from SearchAPIView.
    Returns offers for a product.
    Only works if Layer1 has been called and aggregated_cache exists.
    """

    def offer_identity_score(self, offer, product):
        """How well this offer matches the product cluster identity."""
        name_score = (
            fuzz.token_set_ratio(offer["name"].lower(), product["name"].lower()) / 100
        )
        variant_score = (
            fuzz.token_set_ratio(
                (offer.get("variant") or "").lower(),
                (product.get("variant") or "").lower(),
            )
            / 100
        )
        return 0.7 * name_score + 0.3 * variant_score

    def price_score(self, price, min_price):
        """Soft price influence. Never dominates identity."""
        if price <= 0 or min_price <= 0:
            return 0.0
        return 1 / math.log(price / min_price + 1.2)

    def score_offers_for_product(self, product):
        """Scores offers inside a product cluster."""
        min_price = product["lowest_price"]
        product_relevance = product["relevance"]

        for o in product["offers"]:
            if not o["in_stock"]:
                o["offer_score"] = 0.0
                continue

            identity = self.offer_identity_score(o, product)
            """ if identity <= 0.60:  # Hard reject near-miss models
                o["offer_score"] = 0.0
                continue """

            price_component = self.price_score(o["price"], min_price)
            o["offer_score"] = round(
                0.80 * identity + 0.15 * product_relevance + 0.05 * price_component, 4
            )

    def get(self, request, product_id):
        full = request.GET.get("full", "false").lower() == "true"
        limit = int(
            request.GET.get("limit", LAYER2_LIMIT if not full else LAYER3_LIMIT)
        )

        if full:
            self.throttle_classes = [Layer2FullThrottle]
        else:
            self.throttle_classes = [Layer2PreviewThrottle]

        # --- Index-based cursor like Layer1 ---
        cursor = request.GET.get("cursor")
        offset = int(cursor) if cursor and cursor.isdigit() else 0

        aggregated = request.session.get("aggregated_cache")
        if not aggregated or not request.session.session_key:
            return Response({"error": "invalid session"}, status=403)

        product = next((p for p in aggregated if p["id"] == product_id), None)
        if not product:
            return Response({"offers": [], "has_more": False, "next_cursor": None})

        offers = product["offers"]

        # --- Score offers relative to product ---
        self.score_offers_for_product(product)

        # Sort by offer relevance, not price
        offers.sort(key=lambda o: o.get("offer_score", 0), reverse=True)

        # Slice offers according to index-based cursor
        offers_slice = offers[offset : offset + limit]

        result = (
            offers_slice
            if full
            else [
                {"shop": o["shop"], "name": o["name"], "price": o["price"]}
                for o in offers_slice
            ]
        )

        next_cursor = str(offset + limit) if offset + limit < len(offers) else None
        has_more = next_cursor is not None

        search_engine_log(
            f"Product '{product_id}' offers count={len(product['offers'])}, "
            f"limit={limit}, full={full}, cursor={cursor}"
        )

        return Response(
            {"offers": result, "has_more": has_more, "next_cursor": next_cursor}
        )

    def apply_cursor(self, offers, cursor):
        """Index-based cursor for universal pagination."""
        try:
            offset = int(cursor)
            return offers[offset:]
        except (ValueError, TypeError):
            return offers

    def get_next_cursor(self, offers, limit, offset=0):
        """Return next cursor based on index."""
        next_offset = offset + limit
        if next_offset < len(offers):
            return str(next_offset)
        return None


class AutocompleteAPIView(APIView):
    """
    Returns top autocomplete suggestions for the search bar.
    Uses RapidFuzz to match user input against canonical cluster names.
    Considers brand and category for better relevance.
    """

    throttle_classes = [AutocompleteThrottle]

    @cached_property
    def cluster_names_cache(self):
        """
        Cache one representative name per canonical_id cluster, including brand and category.
        """
        products = Product.objects.all().order_by("id")
        seen = set()
        cluster_names = []

        for p in products:
            cid = p.canonical_id
            if cid and cid not in seen:
                seen.add(cid)
                full_name = f"{p.name} {p.variant}".strip()
                cluster_names.append(
                    {
                        "name": normalize_text(full_name),  # normalized for matching
                        "display": full_name,  # original for display
                        "brand": (p.brand or "").lower(),
                        "category": (p.category or "").lower(),
                    }
                )
        return cluster_names

    def get(self, request):
        query_raw = request.GET.get("q", "").strip()
        query = normalize_text(query_raw)
        autocomplete_log(f"Received query: '{query_raw}' -> normalized: '{query}'")
        embeddings_from_query_log(query)
        if not query:
            return Response({"suggestions": []})

        query_tokens = query.split()
        candidates = []

        for item in self.cluster_names_cache:
            text = item["name"]

            # Fuzzy match
            fuzzy_score = fuzz.token_set_ratio(query, text)

            # Token coverage
            token_hits = sum(1 for t in query_tokens if t in text)
            token_coverage = token_hits / max(len(query_tokens), 1)

            # Brand match
            brand_score = 1.0 if any(t in item["brand"] for t in query_tokens) else 0.0

            # Category match
            category_score = (
                1.0 if any(t in item["category"] for t in query_tokens) else 0.0
            )

            # Final relevance
            relevance = round(
                0.55 * (fuzzy_score / 100)
                + 0.25 * token_coverage
                + 0.1 * brand_score
                + 0.1 * category_score,
                4,
            )

            candidates.append({"name": item["display"], "relevance": relevance})

        # Sort descending by relevance
        candidates.sort(key=lambda x: -x["relevance"])

        # Top N suggestions above a threshold
        suggestions = [
            c["name"] for c in candidates[:AUTOCOMPLETE_LIMIT] if c["relevance"] >= 0.6
        ]

        autocomplete_log(f"Suggestions returned: {suggestions}")

        return Response(
            {"suggestions": suggestions, "raw_matches": candidates[:AUTOCOMPLETE_LIMIT]}
        )
