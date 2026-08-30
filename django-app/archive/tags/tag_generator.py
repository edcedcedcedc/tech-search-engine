# products/tl/tags/tag_generator.py
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Dict, Any, Optional
from collections import defaultdict
from django.utils import timezone
from openai import OpenAI
import environ

from products.models import Product
from products.utils.log.tag_log import tag_log


class TagCache:
    """Handles caching of generated tags."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = base_dir or Path(__file__).resolve().parent.parent.parent.parent
        self.data_dir = self.base_dir / "data" / "tags_cache"
        self.audit_file = self.data_dir / "audit.json"
        self.backup_file = self.data_dir / "audit_backup.json"
        self._cache = defaultdict(dict)
        self._loaded = False

    def _normalize_key(self, raw: str) -> str:
        """Normalize raw string to a lowercase stripped key."""
        return (raw or "").strip().lower()

    def normalize_product_key(self, product_data: Dict[str, Any]) -> str:
        """Create a composite key from product fields for caching."""
        name = product_data.get("name", "").strip().lower()
        category = product_data.get("category", "").strip().lower()
        brand = product_data.get("brand", "").strip().lower()
        variant = product_data.get("variant", "").strip().lower()
        return f"{name}|{category}|{brand}|{variant}"

    def load(self):
        """Load cache from file."""
        if self._loaded:
            return

        if not self.audit_file.exists():
            self.data_dir.mkdir(parents=True, exist_ok=True)
            return

        try:
            with open(self.audit_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for shop, entries in data.items():
                    self._cache[shop] = entries
            self._loaded = True
        except Exception as e:
            tag_log(f"Cache file corrupted or empty: {e}", "warning")
            self._cache = defaultdict(dict)
            self._loaded = True

    def save(self):
        """Save cache to file."""
        try:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            data = {shop: dict(entries) for shop, entries in self._cache.items()}

            # Save to main file
            with open(self.audit_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            # Create backup
            with open(self.backup_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

        except Exception as e:
            tag_log(f"Error saving cache: {e}", "error")

    def get(self, shop: str, product_key: str) -> Optional[Dict]:
        """Return cached tags for given shop + product key."""
        self.load()
        shop_dict = self._cache.get(shop)
        if not shop_dict:
            return None
        return shop_dict.get(product_key)

    def set(self, shop: str, product_key: str, tags: List[str], product_id: int):
        """Store generated tags in cache."""
        self.load()

        if shop not in self._cache:
            self._cache[shop] = {}

        entry = self._cache[shop].get(product_key)
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

        self._cache[shop][product_key] = entry
        self.save()

    def clear(self):
        """Clear the cache."""
        self._cache.clear()
        self._loaded = False
        if self.audit_file.exists():
            self.audit_file.unlink()
        if self.backup_file.exists():
            self.backup_file.unlink()
        tag_log("Cache cleared", "info")

    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        self.load()
        cache_size = sum(len(entries) for entries in self._cache.values())
        total_examples = 0
        for shop_entries in self._cache.values():
            for entry in shop_entries.values():
                total_examples += len(entry.get("examples", []))

        return {
            "shops": len(self._cache),
            "product_types": cache_size,
            "total_examples": total_examples,
            "avg_examples_per_type": (
                total_examples / cache_size if cache_size > 0 else 0
            ),
        }

    def find_similar(self, search_term: str, shop: Optional[str] = None) -> List[Dict]:
        """Find cached entries containing search term."""
        self.load()
        search_lower = search_term.lower()
        results = []

        for shop_name, shop_entries in self._cache.items():
            if shop and shop_name != shop:
                continue

            for product_key, entry in shop_entries.items():
                tags = entry.get("tags", [])
                matching_tags = [tag for tag in tags if search_lower in tag.lower()]
                if matching_tags:
                    results.append(
                        {
                            "shop": shop_name,
                            "product_key": product_key,
                            "matching_tags": matching_tags,
                            "all_tags": tags,
                            "example_count": len(entry.get("examples", [])),
                            "first_seen": entry.get("first_seen"),
                        }
                    )

        return results


class TagGenerator:
    """Main tag generator class."""

    def __init__(
        self, client: Optional[OpenAI] = None, cache: Optional[TagCache] = None
    ):
        self.client = client
        self.cache = cache or TagCache()
        self._setup_encoding()

    def _setup_encoding(self):
        """Setup encoding for Windows."""
        if sys.platform == "win32":
            try:
                import io

                sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
                sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
            except:
                pass

    @staticmethod
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

    def set_client(self, client: OpenAI):
        """Set or update the OpenAI client."""
        self.client = client

    def set_client_from_env(self, env_file: Optional[str] = None):
        """Initialize OpenAI client from environment."""
        env = environ.Env()
        if env_file:
            environ.Env.read_env(env_file)
        else:
            environ.Env.read_env()

        api_key = env("OPENAI_API_KEY", default=None)
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment")

        self.client = OpenAI(api_key=api_key)

    def generate_for_product(
        self,
        product: Product,
        db: str = "default",
        max_tags: int = 8,
        lang: str = "ro",
        use_cache: bool = True,
        force_regenerate: bool = False,
    ) -> Dict[str, Any]:
        """
        Generate tags for a single product.

        Returns:
            Dict with status and details
        """
        # Validate
        if self.client is None:
            return {
                "status": "error",
                "message": "OpenAI client not initialized",
                "product_id": product.id,
            }

        shop = product.shop.lower() if product.shop else "unknown"

        # Prepare product data for cache key
        product_data = {
            "name": product.name or "",
            "category": product.category or "",
            "brand": product.brand or "",
            "variant": product.variant or "",
        }
        product_key = self.cache.normalize_product_key(product_data)

        # Check if already has tags
        if not force_regenerate and product.tags and len(product.tags) > 0:
            return {
                "status": "skipped",
                "reason": "already_has_tags",
                "product_id": product.id,
                "shop": shop,
                "existing_tags": product.tags,
            }

        # Check cache
        if use_cache and not force_regenerate:
            cached = self.cache.get(shop, product_key)
            if cached:
                tags = cached.get("tags", [])
                if tags:
                    product.tags = tags
                    product.save(using=db)
                    return {
                        "status": "cached",
                        "product_id": product.id,
                        "shop": shop,
                        "tags": tags,
                        "tags_count": len(tags),
                    }

        # Prepare context
        context_parts = []
        if product.name:
            context_parts.append(f"Nume: {self.clean_text(product.name)}")
        if product.brand:
            context_parts.append(f"Brand: {self.clean_text(product.brand)}")
        if product.category:
            context_parts.append(f"Categorie: {self.clean_text(product.category)}")
        if product.variant:
            context_parts.append(f"Varianta: {self.clean_text(product.variant)}")

        context = "\n".join(context_parts)
        if not context:
            return {
                "status": "error",
                "message": "No product data",
                "product_id": product.id,
            }

        # System prompts
        system_prompts = {
            "ro": (
                "Esti un asistent pentru generarea de tag-uri pentru produse. "
                "Genereaza tag-uri relevante, concise si utile pentru cautare in limba romana. "
                "Include tag-uri pentru: caracteristici principale, utilizare, tipul produsului, brand, categorii relevante."
                "Tagurile trebuie sa fie bune pentru embedding si mai axate pe variante de exemplu daca e monitor 3840 x 2160, atunci 4k si tot asa"
                f"Genereaza maximum {max_tags} tag-uri. "
                "Returneaza doar un array JSON cu tag-uri, fara alte texte. "
                'Exemplu: ["telefon", "smartphone", "Apple", "iPhone", "ecran mare", "5G"]'
            ),
            "en": (
                "You are a product tag generation assistant. "
                "Generate relevant, concise and search-useful tags in English. "
                "Include tags for: main features, usage, product type, brand, relevant categories. "
                f"Generate maximum {max_tags} tags. "
                "Return only a JSON array of tags, no other text. "
                'Example: ["phone", "smartphone", "Apple", "iPhone", "large screen", "5G"]'
            ),
        }

        try:
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",  # You can change model here
                temperature=0.7,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompts.get(lang, system_prompts["ro"]),
                    },
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
                        if "," in line:
                            tags.extend(
                                [t.strip() for t in line.split(",") if t.strip()]
                            )
                        else:
                            tags.append(line)

            # Clean and limit tags
            cleaned_tags = []
            for tag in tags[:max_tags]:
                if tag:
                    tag_str = self.clean_text(str(tag).strip())
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
                    self.cache.set(shop, product_key, unique_tags, product.id)

                tag_log(
                    f"[{db}] Generated {len(unique_tags)} tags for product {product.id} ({shop})"
                )
                return {
                    "status": "generated",
                    "product_id": product.id,
                    "shop": shop,
                    "tags": unique_tags,
                    "tags_count": len(unique_tags),
                }
            else:
                tag_log(f"[{db}] No valid tags for product {product.id}", "warning")
                return {
                    "status": "error",
                    "message": "No valid tags generated",
                    "product_id": product.id,
                    "raw_response": content,
                }

        except Exception as e:
            error_msg = str(e)
            tag_log(f"[{db}] Error for product {product.id}: {error_msg}", "error")
            return {
                "status": "error",
                "message": f"API error: {error_msg[:100]}",
                "product_id": product.id,
            }

    def process_database(
        self,
        db: str,
        max_tags: int = 8,
        lang: str = "ro",
        use_cache: bool = True,
        force_regenerate: bool = False,
        max_workers: int = 5,
        batch_size: int = 50,
        product_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Process all products in a database with threading.
        """
        if self.client is None:
            raise ValueError("OpenAI client not initialized")

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
                # SQLite-compatible query for empty JSON array
                # tags field can be: NULL, '[]', '', or 'null'
                from django.db.models import Q

                queryset = Product.objects.using(db).filter(
                    Q(tags__isnull=True)
                    | Q(tags__exact="")
                    | Q(tags__exact="[]")
                    | Q(tags__exact="null")
                    | Q(tags__exact='""')
                )

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
                            self._process_single_product_wrapper,
                            product=product,
                            db=db,
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
                if offset + batch_size < total:
                    tag_log(
                        f"[{db}] Progress: {progress}/{total} ({progress/total*100:.1f}%)"
                    )

        except Exception as e:
            tag_log(f"[{db}] Database error: {str(e)}", "error")
            stats["error_details"].append(
                {"db": db, "message": f"Database error: {str(e)}"}
            )

        return stats

    def _process_single_product_wrapper(
        self,
        product: Product,
        db: str,
        max_tags: int,
        lang: str,
        use_cache: bool,
        force_regenerate: bool,
    ) -> Dict[str, Any]:
        """Wrapper for processing single product in threads."""
        return self.generate_for_product(
            product=product,
            db=db,
            max_tags=max_tags,
            lang=lang,
            use_cache=use_cache,
            force_regenerate=force_regenerate,
        )

    def process_multiple_databases(
        self,
        databases: List[str],
        max_tags: int = 8,
        lang: str = "ro",
        use_cache: bool = True,
        force_regenerate: bool = False,
        max_workers: int = 5,
        batch_size: int = 50,
        product_ids: Optional[List[int]] = None,
        test_mode: bool = False,
    ) -> Dict[str, Any]:
        """
        Process multiple databases.

        Returns:
            Overall statistics
        """
        if test_mode:
            max_workers = 2
            batch_size = 5
            tag_log("TEST MODE - Limited processing", "warning")

        all_stats = []

        for db in databases:
            tag_log(f"\n{'='*50}")
            tag_log(f"Database: {db}")
            tag_log(f"{'='*50}")

            # Get product IDs for test mode
            db_product_ids = None
            if test_mode:
                if product_ids:
                    db_product_ids = product_ids[:5]
                else:
                    db_product_ids = list(
                        Product.objects.using(db).values_list("id", flat=True)[:5]
                    )
                tag_log(f"Test mode: Processing {len(db_product_ids)} products")
                if db_product_ids:
                    tag_log(f"Product IDs: {db_product_ids}")

            stats = self.process_database(
                db=db,
                max_tags=max_tags,
                lang=lang,
                use_cache=use_cache,
                force_regenerate=force_regenerate,
                max_workers=max_workers,
                batch_size=batch_size,
                product_ids=db_product_ids or product_ids,
            )

            all_stats.append(stats)

            tag_log(f"\nDatabase {db} completed:")
            tag_log(f"  Processed: {stats['processed']}")
            tag_log(f"  Generated: {stats['generated']}")
            tag_log(f"  Cached: {stats['cached']}")
            tag_log(f"  Skipped: {stats['skipped']}")
            tag_log(f"  Errors: {stats['errors']}")

        # Calculate totals
        total_stats = {
            "processed": sum(s["processed"] for s in all_stats),
            "generated": sum(s["generated"] for s in all_stats),
            "cached": sum(s["cached"] for s in all_stats),
            "skipped": sum(s["skipped"] for s in all_stats),
            "errors": sum(s["errors"] for s in all_stats),
            "databases": len(databases),
        }

        # Log final summary
        tag_log("\n" + "=" * 50)
        tag_log("TAG GENERATION COMPLETE")
        tag_log("=" * 50)
        tag_log(f"TOTAL STATISTICS:")
        tag_log(f"  Products processed: {total_stats['processed']}")
        tag_log(f"  Tags newly generated: {total_stats['generated']}")
        tag_log(f"  Tags from cache: {total_stats['cached']}")
        tag_log(f"  Skipped (had tags): {total_stats['skipped']}")
        tag_log(f"  Errors: {total_stats['errors']}")

        # Cache stats
        cache_stats = self.cache.stats()
        tag_log(f"\nCACHE INFO:")
        tag_log(f"  Shops in cache: {cache_stats['shops']}")
        tag_log(f"  Product types cached: {cache_stats['product_types']}")
        tag_log(f"  Total examples: {cache_stats['total_examples']}")

        return total_stats

    def add_tag(self, product_id: int, tag: str, db: str = "default") -> bool:
        """Add a single tag to a product."""
        try:
            product = Product.objects.using(db).get(id=product_id)
            if not product.tags:
                product.tags = []

            tag_clean = self.clean_text(tag.strip())
            if tag_clean and tag_clean not in product.tags:
                product.tags.append(tag_clean)
                product.save(using=db)
                return True
            return False
        except Exception as e:
            tag_log(f"[{db}] Error adding tag to product {product_id}: {e}", "error")
            return False

    def remove_tag(self, product_id: int, tag: str, db: str = "default") -> bool:
        """Remove a tag from a product."""
        try:
            product = Product.objects.using(db).get(id=product_id)
            if product.tags and tag in product.tags:
                product.tags.remove(tag)
                product.save(using=db)
                return True
            return False
        except Exception as e:
            tag_log(
                f"[{db}] Error removing tag from product {product_id}: {e}", "error"
            )
            return False

    def clear_tags(self, product_id: int, db: str = "default") -> bool:
        """Clear all tags from a product."""
        try:
            product = Product.objects.using(db).get(id=product_id)
            product.tags = []
            product.save(using=db)
            return True
        except Exception as e:
            tag_log(
                f"[{db}] Error clearing tags for product {product_id}: {e}", "error"
            )
            return False
