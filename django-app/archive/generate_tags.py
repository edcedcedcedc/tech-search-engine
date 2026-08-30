# products/management/commands/generate_tags.py
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Dict, Any
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.utils import timezone
from openai import OpenAI
import environ

# Import models
from products.models import Product
from products.utils.log.tag_log import tag_log


# ----- CACHE SYSTEM -----
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "tags_cache"
TAGS_AUDIT_FILE = DATA_DIR / "audit.json"

_cache = defaultdict(dict)


def normalize_key(raw: str) -> str:
    """Normalize raw string to a lowercase stripped key."""
    return (raw or "").strip().lower()


def normalize_product_key(product_data: Dict[str, Any]) -> str:
    """Create a composite key from product fields for caching."""
    name = product_data.get("name", "").strip().lower()
    category = product_data.get("category", "").strip().lower()
    brand = product_data.get("brand", "").strip().lower()
    variant = product_data.get("variant", "").strip().lower()

    # Create a consistent key from the combination
    return f"{name}|{category}|{brand}|{variant}"


def clean_text(text: str) -> str:
    """Clean text to avoid encoding issues."""
    if not text:
        return ""

    # Replace problematic Romanian characters
    replacements = {
        "ș": "s",
        "ț": "t",
        "ă": "a",
        "â": "a",
        "î": "i",
        "Ș": "S",
        "Ț": "T",
        "Ă": "A",
        "Â": "A",
        "Î": "I",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return text


def load_cache():
    """Load cache from file."""
    global _cache
    if not TAGS_AUDIT_FILE.exists():
        return

    try:
        with open(TAGS_AUDIT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            for shop, entries in data.items():
                _cache[shop] = entries
    except:
        tag_log("Cache file corrupted or empty, starting fresh", "warning")
        _cache = defaultdict(dict)


def save_cache():
    """Save cache to file."""
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(TAGS_AUDIT_FILE, "w", encoding="utf-8") as f:
            json.dump(dict(_cache), f, indent=2, ensure_ascii=False)
    except Exception as e:
        tag_log(f"Error saving cache: {e}", "error")


def get_cached_tags(shop: str, product_key: str):
    """Return cached tags for given shop + product key."""
    load_cache()
    shop_dict = _cache.get(shop)
    if not shop_dict:
        return None
    return shop_dict.get(product_key)


def set_cached_tags(shop: str, product_key: str, tags: List[str], product_id: int):
    """Store generated tags in cache."""
    load_cache()

    if shop not in _cache:
        _cache[shop] = {}

    entry = _cache[shop].get(product_key)
    if entry is None:
        entry = {
            "tags": tags,
            "first_seen": timezone.now().isoformat(),
            "examples": [product_id],
        }
    else:
        entry["tags"] = tags
        if product_id not in entry["examples"]:
            entry["examples"].append(product_id)

    _cache[shop][product_key] = entry
    save_cache()


# ----- TAG GENERATION CORE -----
def generate_tags_for_single_product(
    product_id: int,
    db="default",
    client: OpenAI = None,
    max_tags: int = 8,
    lang: str = "ro",
    use_cache: bool = True,
    force_regenerate: bool = False,
) -> Dict[str, Any]:
    """
    Generate tags for a single product.
    """
    try:
        product = Product.objects.using(db).get(id=product_id)
    except Product.DoesNotExist:
        return {
            "status": "error",
            "message": f"Product {product_id} not found",
            "product_id": product_id,
        }

    shop = product.shop.lower() if product.shop else "unknown"

    # Prepare product data for cache key
    product_data = {
        "name": product.name or "",
        "category": product.category or "",
        "brand": product.brand or "",
        "variant": product.variant or "",
    }
    product_key = normalize_product_key(product_data)

    # Check if already has tags
    if not force_regenerate and product.tags and len(product.tags) > 0:
        return {
            "status": "skipped",
            "reason": "already_has_tags",
            "product_id": product_id,
            "shop": shop,
            "existing_tags": product.tags,
        }

    # Check cache
    if use_cache and not force_regenerate:
        cached = get_cached_tags(shop, product_key)
        if cached:
            tags = cached.get("tags", [])
            if tags:
                product.tags = tags
                product.save(using=db)
                return {
                    "status": "cached",
                    "product_id": product_id,
                    "shop": shop,
                    "tags": tags,
                    "tags_count": len(tags),
                }

    # Generate with OpenAI
    if client is None:
        return {
            "status": "error",
            "message": "OpenAI client required",
            "product_id": product_id,
        }

    # Prepare context
    context_parts = []
    if product.name:
        context_parts.append(f"Nume: {clean_text(product.name)}")
    if product.brand:
        context_parts.append(f"Brand: {clean_text(product.brand)}")
    if product.category:
        context_parts.append(f"Categorie: {clean_text(product.category)}")
    if product.variant:
        context_parts.append(f"Varianta: {clean_text(product.variant)}")

    context = "\n".join(context_parts)
    if not context:
        return {
            "status": "error",
            "message": "No product data",
            "product_id": product_id,
        }

    # System prompt
    system_prompt = (
        "Esti un asistent pentru generarea de tag-uri pentru produse. "
        "Genereaza tag-uri relevante, concise si utile pentru cautare in limba romana. "
        "Include tag-uri pentru: caracteristici principale, utilizare, tipul produsului, brand, categorii relevante. "
        f"Genereaza maximum {max_tags} tag-uri. "
        "Returneaza doar un array JSON cu tag-uri, fara alte texte. "
        'Exemplu: ["telefon", "smartphone", "Apple", "iPhone", "ecran mare", "5G"]'
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",  # You can change to gpt-3.5-turbo if needed
            temperature=0.7,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Produs:\n{context}\n\nGenereaza tag-uri:",
                },
            ],
        )

        content = response.choices[0].message.content.strip()

        # Try to parse as JSON
        try:
            tags = json.loads(content)
            if not isinstance(tags, list):
                tags = [str(tags)]
        except json.JSONDecodeError:
            # Try to extract tags from text
            lines = [line.strip() for line in content.split("\n") if line.strip()]
            tags = []
            for line in lines:
                line = line.strip('"-•*[]{}')
                if line:
                    # Split by commas if multiple tags in one line
                    if "," in line:
                        tags.extend([t.strip() for t in line.split(",") if t.strip()])
                    else:
                        tags.append(line)

        # Clean and limit tags
        cleaned_tags = []
        for tag in tags[:max_tags]:
            if tag:
                tag_str = clean_text(str(tag).strip())
                if tag_str and 1 < len(tag_str) < 50:  # Minimum 2 characters
                    cleaned_tags.append(tag_str)

        # Remove duplicates
        seen = set()
        unique_tags = []
        for tag in cleaned_tags:
            tag_lower = tag.lower()
            if tag_lower not in seen:
                seen.add(tag_lower)
                unique_tags.append(tag)

        if unique_tags:
            product.tags = unique_tags
            product.save(using=db)

            if use_cache:
                set_cached_tags(shop, product_key, unique_tags, product_id)

            tag_log(
                f"[{db}] Generated {len(unique_tags)} tags for product {product_id} ({shop})"
            )
            return {
                "status": "generated",
                "product_id": product_id,
                "shop": shop,
                "tags": unique_tags,
                "tags_count": len(unique_tags),
            }
        else:
            tag_log(f"[{db}] No valid tags for product {product_id}", "warning")
            return {
                "status": "error",
                "message": "No valid tags generated",
                "product_id": product_id,
                "raw_response": content,
            }

    except Exception as e:
        error_msg = str(e)
        tag_log(f"[{db}] Error for product {product_id}: {error_msg}", "error")
        return {
            "status": "error",
            "message": f"API error: {error_msg[:100]}",
            "product_id": product_id,
        }


def process_database(
    db: str,
    client: OpenAI,
    max_tags: int = 8,
    lang: str = "ro",
    use_cache: bool = True,
    force_regenerate: bool = False,
    max_workers: int = 5,
    batch_size: int = 50,
    product_ids: List[int] = None,
) -> Dict[str, Any]:
    """
    Process all products in a database with threading.
    """
    stats = {
        "db": db,
        "processed": 0,
        "generated": 0,
        "cached": 0,
        "skipped": 0,
        "errors": 0,
        "error_details": [],
    }

    try:
        # Get queryset
        if product_ids:
            queryset = Product.objects.using(db).filter(id__in=product_ids)
        elif force_regenerate:
            queryset = Product.objects.using(db).all()
        else:
            # TO (safe fix that won't break anything):
            from django.db.models import Q
            queryset = Product.objects.using(db).filter(
                Q(tags__isnull=True) | Q(tags__exact=[]) | Q(tags__len=0)
            ).distinct()

        total = queryset.count()

        if total == 0:
            tag_log(f"[{db}] No products to process")
            return stats

        tag_log(f"[{db}] Processing {total} products with {max_workers} workers")

        # Process in batches
        for offset in range(0, total, batch_size):
            batch = list(queryset[offset : offset + batch_size])

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {}
                for product in batch:
                    future = executor.submit(
                        generate_tags_for_single_product,
                        product_id=product.id,
                        db=db,
                        client=client,
                        max_tags=max_tags,
                        lang=lang,
                        use_cache=use_cache,
                        force_regenerate=force_regenerate,
                    )
                    futures[future] = product.id

                # Collect results
                for future in as_completed(futures):
                    product_id = futures[future]
                    try:
                        result = future.result(timeout=60)
                        stats["processed"] += 1

                        if result["status"] == "generated":
                            stats["generated"] += 1
                        elif result["status"] == "cached":
                            stats["cached"] += 1
                        elif result["status"] == "skipped":
                            stats["skipped"] += 1
                        elif result["status"] == "error":
                            stats["errors"] += 1
                            stats["error_details"].append(
                                {
                                    "product_id": product_id,
                                    "message": result.get("message", "Unknown"),
                                }
                            )

                    except Exception as e:
                        stats["errors"] += 1
                        stats["error_details"].append(
                            {
                                "product_id": product_id,
                                "message": f"Timeout/Processing error: {str(e)}",
                            }
                        )

            # Log progress
            progress = min(offset + batch_size, total)
            tag_log(f"[{db}] Progress: {progress}/{total} ({progress/total*100:.1f}%)")

    except Exception as e:
        tag_log(f"[{db}] Database error: {str(e)}", "error")
        stats["error_details"].append(
            {"db": db, "message": f"Database error: {str(e)}"}
        )

    return stats


class Command(BaseCommand):
    help = "Generate tags for products using OpenAI"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dbs",
            nargs="+",
            default=["default"],
            help="Databases to process (space separated)",
        )
        parser.add_argument(
            "--max-tags", type=int, default=8, help="Maximum number of tags per product"
        )
        parser.add_argument(
            "--lang",
            choices=["ro", "en"],
            default="ro",
            help="Language for generated tags",
        )
        parser.add_argument(
            "--no-cache", action="store_true", help="Disable cache for tag generation"
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force regenerate tags even if they exist",
        )
        parser.add_argument(
            "--max-workers",
            type=int,
            default=5,
            help="Maximum number of concurrent workers per database",
        )
        parser.add_argument(
            "--batch-size", type=int, default=50, help="Number of products per batch"
        )
        parser.add_argument(
            "--product-ids", nargs="+", type=int, help="Specific product IDs to process"
        )
        parser.add_argument(
            "--test", action="store_true", help="Test mode - process only 10 products"
        )
        parser.add_argument(
            "--clear-cache",
            action="store_true",
            help="Clear the tags cache before starting",
        )

    def handle(self, *args, **options):
        # Setup encoding for Windows
        if sys.platform == "win32":
            try:
                import io

                sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
                sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
            except:
                pass

        # Initialize
        env = environ.Env()
        environ.Env.read_env()

        # Get OpenAI API key
        api_key = env("OPENAI_API_KEY", default=None)
        if not api_key:
            self.stderr.write(self.style.ERROR("OPENAI_API_KEY not found"))
            return

        client = OpenAI(api_key=api_key)

        # Clear cache if requested
        if options["clear_cache"] and TAGS_AUDIT_FILE.exists():
            try:
                TAGS_AUDIT_FILE.unlink()
                self.stdout.write(self.style.SUCCESS("Cache cleared"))
            except:
                pass

        # Adjust for test mode
        if options["test"]:
            options["max_workers"] = 2
            options["batch_size"] = 5
            self.stdout.write(self.style.WARNING("TEST MODE - Limited processing"))

        databases = options["dbs"]
        all_stats = []

        self.stdout.write(
            f"Starting tag generation for databases: {', '.join(databases)}"
        )
        self.stdout.write(
            f"Settings: max_tags={options['max_tags']}, lang={options['lang']}"
        )
        self.stdout.write(
            f"Cache: {'disabled' if options['no_cache'] else 'enabled'}, Force: {options['force']}"
        )
        self.stdout.write(
            f"Workers: {options['max_workers']}, Batch size: {options['batch_size']}"
        )

        for db in databases:
            self.stdout.write(f"\n{'='*50}")
            self.stdout.write(f"Database: {db}")
            self.stdout.write(f"{'='*50}")

            # Get product IDs for test mode
            product_ids = None
            if options["test"]:
                if options["product_ids"]:
                    product_ids = options["product_ids"][:5]
                else:
                    product_ids = list(
                        Product.objects.using(db).values_list("id", flat=True)[:5]
                    )
                self.stdout.write(f"Test mode: Processing {len(product_ids)} products")
                if product_ids:
                    self.stdout.write(f"Product IDs: {product_ids}")

            stats = process_database(
                db=db,
                client=client,
                max_tags=options["max_tags"],
                lang=options["lang"],
                use_cache=not options["no_cache"],
                force_regenerate=options["force"],
                max_workers=options["max_workers"],
                batch_size=options["batch_size"],
                product_ids=product_ids or options["product_ids"],
            )

            all_stats.append(stats)

            # Print database summary
            self.stdout.write(f"\nDatabase {db} completed:")
            self.stdout.write(f"  Processed: {stats['processed']}")
            self.stdout.write(f"  Generated: {stats['generated']}")
            self.stdout.write(f"  Cached: {stats['cached']}")
            self.stdout.write(f"  Skipped: {stats['skipped']}")
            self.stdout.write(f"  Errors: {stats['errors']}")

        # Final summary
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("TAG GENERATION COMPLETE"))
        self.stdout.write("=" * 50)

        total_stats = {
            "processed": sum(s["processed"] for s in all_stats),
            "generated": sum(s["generated"] for s in all_stats),
            "cached": sum(s["cached"] for s in all_stats),
            "skipped": sum(s["skipped"] for s in all_stats),
            "errors": sum(s["errors"] for s in all_stats),
        }

        self.stdout.write(f"TOTAL STATISTICS:")
        self.stdout.write(f"  Products processed: {total_stats['processed']}")
        self.stdout.write(f"  Tags newly generated: {total_stats['generated']}")
        self.stdout.write(f"  Tags from cache: {total_stats['cached']}")
        self.stdout.write(f"  Skipped (had tags): {total_stats['skipped']}")
        self.stdout.write(f"  Errors: {total_stats['errors']}")

        # Cache info
        load_cache()
        cache_size = sum(len(entries) for entries in _cache.values())
        self.stdout.write(f"\nCACHE INFO:")
        self.stdout.write(f"  Product types cached: {cache_size}")
        self.stdout.write(f"  Shops in cache: {len(_cache)}")

        if total_stats["errors"] == 0:
            self.stdout.write(
                self.style.SUCCESS("\n✓ All operations completed successfully!")
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"\n⚠ Completed with {total_stats['errors']} errors")
            )

            # Show error summary
            error_summary = {}
            for stats in all_stats:
                for error in stats["error_details"][:3]:  # First 3 errors per db
                    msg = error["message"]
                    error_summary[msg] = error_summary.get(msg, 0) + 1

            if error_summary:
                self.stdout.write("\nMost common errors:")
                for msg, count in list(error_summary.items())[:5]:
                    self.stdout.write(f"  {count}x: {msg[:80]}...")
