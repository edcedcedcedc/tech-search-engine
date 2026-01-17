import random
from django.core.management.base import BaseCommand
from products.models import Product
from products.utils.log.generate_embeddings_from_object_log import (
    generate_embeddings_from_object_log,
)
import numpy as np
from numpy.linalg import norm
import json
from collections import defaultdict


# python manage.py test_embeddings   --check-translations --source=stage
def cosine_sim(a, b):
    return np.dot(a, b) / (norm(a) * norm(b))


class Command(BaseCommand):
    help = "Test embeddings and semantic similarity to check translation state"

    def add_arguments(self, parser):
        parser.add_argument(
            "--samples", type=int, default=100, help="Number of products to sample"
        )
        parser.add_argument(
            "--source", type=str, default="stage", help="Database to use"
        )
        parser.add_argument(
            "--check-translations",
            action="store_true",
            help="Also check translation completeness",
        )
        parser.add_argument(
            "--compare-languages",
            action="store_true",
            help="Compare embeddings across different languages",
        )

    def handle(self, *args, **options):
        samples = options["samples"]
        db = options["source"]
        check_translations = options["check_translations"]
        compare_languages = options["compare_languages"]

        # Get products with embeddings
        products_with_embeddings = Product.objects.using(db).exclude(
            embedding__isnull=True
        )
        total_with_embeddings = products_with_embeddings.count()

        generate_embeddings_from_object_log(
            f"Total products with embeddings: {total_with_embeddings}"
        )

        if total_with_embeddings == 0:
            generate_embeddings_from_object_log("No embeddings found!")
            return

        # Sample products
        if total_with_embeddings > samples:
            sample_products = list(
                random.sample(list(products_with_embeddings), samples)
            )
        else:
            sample_products = list(products_with_embeddings)

        generate_embeddings_from_object_log(
            f"\n=== ANALYZING {len(sample_products)} SAMPLES ==="
        )

        # Load embeddings
        embeddings = []
        product_data = []

        for p in sample_products:
            try:
                emb = json.loads(p.embedding)
                embeddings.append(np.array(emb))
                product_data.append(p)
            except:
                continue

        if not embeddings:
            generate_embeddings_from_object_log("No valid embeddings found in samples!")
            return

        # 1. Test basic cosine similarity between random pairs
        generate_embeddings_from_object_log("\n=== RANDOM PAIR SIMILARITY ===")
        similarity_scores = []

        for _ in range(min(20, len(embeddings) // 2)):
            if len(embeddings) < 2:
                break

            idx1, idx2 = random.sample(range(len(embeddings)), 2)
            sim = cosine_sim(embeddings[idx1], embeddings[idx2])
            similarity_scores.append(sim)

            p1 = product_data[idx1]
            p2 = product_data[idx2]

            generate_embeddings_from_object_log(
                f"Similarity: {sim:.3f} | "
                f"Product {p1.id}: {p1.t_name.get('en', 'NO_EN')[:50]}... vs "
                f"Product {p2.id}: {p2.t_name.get('en', 'NO_EN')[:50]}..."
            )

        # Statistics
        if similarity_scores:
            generate_embeddings_from_object_log(
                f"\nSimilarity Stats: "
                f"Min={min(similarity_scores):.3f}, "
                f"Max={max(similarity_scores):.3f}, "
                f"Avg={np.mean(similarity_scores):.3f}, "
                f"Std={np.std(similarity_scores):.3f}"
            )

        # 2. Check for translation completeness if requested
        if check_translations:
            generate_embeddings_from_object_log("\n=== TRANSLATION COMPLETENESS ===")

            translation_stats = defaultdict(int)

            for p in sample_products:
                t_name = p.t_name or {}
                t_variant = p.t_variant or {}
                t_category = p.t_category or {}

                # Check what's missing
                missing = []

                # Name translations
                if not t_name.get("en"):
                    missing.append("name_en")
                if not t_name.get("ru"):
                    missing.append("name_ru")

                # Variant translations (only check if variant exists)
                if p.variant and p.variant.strip():
                    if not t_variant.get("en"):
                        missing.append("variant_en")
                    if not t_variant.get("ru"):
                        missing.append("variant_ru")

                # Category translations
                if not t_category.get("en"):
                    missing.append("category_en")
                if not t_category.get("ru"):
                    missing.append("category_ru")

                # Record stats
                if missing:
                    for field in missing:
                        translation_stats[field] += 1
                    translation_stats["any_missing"] += 1
                else:
                    translation_stats["complete"] += 1

            # Log stats
            generate_embeddings_from_object_log(
                f"Complete translations: {translation_stats.get('complete', 0)}/{len(sample_products)}"
            )
            generate_embeddings_from_object_log(
                f"Any missing: {translation_stats.get('any_missing', 0)}/{len(sample_products)}"
            )

            for field, count in sorted(translation_stats.items()):
                if field not in ["complete", "any_missing"]:
                    generate_embeddings_from_object_log(f"  Missing {field}: {count}")

        # 3. Compare semantic clusters by category
        generate_embeddings_from_object_log("\n=== CATEGORY-BASED SEMANTICS ===")

        # Group by category
        categories = defaultdict(list)
        for p, emb in zip(product_data, embeddings):
            cat = p.category or "No category"
            categories[cat].append((p, emb))

        # Test intra-category similarity (should be high)
        for cat, items in list(categories.items())[:5]:  # Show top 5 categories
            if len(items) >= 2:
                # Calculate average similarity within category
                similarities = []
                for i in range(len(items)):
                    for j in range(i + 1, len(items)):
                        sim = cosine_sim(items[i][1], items[j][1])
                        similarities.append(sim)

                if similarities:
                    avg_sim = np.mean(similarities)
                    generate_embeddings_from_object_log(
                        f"Category '{cat[:30]}...' ({len(items)} items): "
                        f"Avg intra-category similarity = {avg_sim:.3f}"
                    )

        # 4. Find potential duplicates (very high similarity)
        generate_embeddings_from_object_log(
            "\n=== POTENTIAL DUPLICATES (sim > 0.95) ==="
        )

        duplicate_pairs = []
        checked_pairs = set()

        for i in range(len(embeddings)):
            for j in range(i + 1, len(embeddings)):
                sim = cosine_sim(embeddings[i], embeddings[j])
                if sim > 0.95:
                    p1, p2 = product_data[i], product_data[j]
                    pair_key = tuple(sorted([p1.id, p2.id]))

                    if pair_key not in checked_pairs:
                        duplicate_pairs.append((sim, p1, p2))
                        checked_pairs.add(pair_key)

        for sim, p1, p2 in duplicate_pairs[:10]:  # Show top 10
            generate_embeddings_from_object_log(
                f"High similarity {sim:.3f}: "
                f"ID {p1.id} '{p1.t_name.get('en', p1.name)[:50]}...' vs "
                f"ID {p2.id} '{p2.t_name.get('en', p2.name)[:50]}...'"
            )

        # 5. Check embedding quality by language availability
        generate_embeddings_from_object_log("\n=== EMBEDDING QUALITY ANALYSIS ===")

        quality_groups = defaultdict(int)

        for p in sample_products:
            t_name = p.t_name or {}
            t_variant = p.t_variant or {}
            t_category = p.t_category or {}

            # Count available languages
            langs_available = set()

            for lang in ["en", "ru", "ro"]:
                if t_name.get(lang) or t_variant.get(lang) or t_category.get(lang):
                    langs_available.add(lang)

            quality_groups[len(langs_available)] += 1

        for lang_count, product_count in sorted(quality_groups.items()):
            generate_embeddings_from_object_log(
                f"Products with {lang_count} languages available: {product_count}"
            )

        generate_embeddings_from_object_log("\n=== RECOMMENDATIONS ===")

        # Generate recommendations based on findings
        if translation_stats.get("any_missing", 0) > len(sample_products) * 0.5:
            generate_embeddings_from_object_log(
                "⚠️  WARNING: Many translations missing! Run translation command first."
            )

        if duplicate_pairs:
            generate_embeddings_from_object_log(
                f"⚠️  Found {len(duplicate_pairs)} potential duplicate pairs"
            )

        if (
            quality_groups.get(0, 0) > 0
            or quality_groups.get(1, 0) > len(sample_products) * 0.3
        ):
            generate_embeddings_from_object_log(
                "⚠️  Poor embedding quality detected - regenerate after fixing translations"
            )

        generate_embeddings_from_object_log("Test completed successfully!")
