# Show help
# python manage.py normalize_categories --help

# Process a single product
# python manage.py normalize_categories --product-id 123

# Process all products
# python manage.py normalize_categories

# Process with limit
# python manage.py normalize_categories --limit 100

# Process only from specific shop
# python manage.py normalize_categories --shop "enter"

# Debug cache
# python manage.py normalize_categories --debug-cache

# Backup cache
# python manage.py normalize_categories --backup-cache

# Repair cache
# python manage.py normalize_categories --repair-cache

# Reload cache from disk
# python manage.py normalize_categories --reload-cache

# Dry run (no changes)
# python manage.py normalize_categories --dry-run --verbose

# Skip audit cache (always use OpenAI)
# python manage.py normalize_categories --skip-audit --limit 10

# Verbose output
# python manage.py normalize_categories --verbose --limit 50


import json
from pathlib import Path
from django.utils import timezone
import threading
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from products.constants import categories
from products.utils.log.category_log import category_log
from products.models import Product
from openai import OpenAI
import environ

# =========================
# Global cache (shared with other modules)
# =========================
CATEGORY_AUDIT_FILE = Path("./data/audit.json")
CATEGORY_AUDIT_BACKUP = Path("./data/audit_backup.json")
CATEGORY_CACHE = defaultdict(dict)
_cache_lock = threading.Lock()


# =========================
# Cache management functions
# =========================
def _load_category_cache():
    """Safely load category cache with backup recovery."""
    global CATEGORY_CACHE

    # Try to load from main file
    if CATEGORY_AUDIT_FILE.exists():
        try:
            with CATEGORY_AUDIT_FILE.open("r", encoding="utf-8") as f:
                loaded_data = json.load(f)
                if isinstance(loaded_data, dict):
                    CATEGORY_CACHE = defaultdict(dict, loaded_data)
                    category_log(
                        f"[CATEGORY AUDIT] Loaded {len(CATEGORY_CACHE)} shops from audit file"
                    )
                    return
        except Exception as e:
            category_log(f"[CATEGORY AUDIT] Failed to load main audit file: {e}")

    # Try backup file
    if CATEGORY_AUDIT_BACKUP.exists():
        try:
            with CATEGORY_AUDIT_BACKUP.open("r", encoding="utf-8") as f:
                loaded_data = json.load(f)
                if isinstance(loaded_data, dict):
                    CATEGORY_CACHE = defaultdict(dict, loaded_data)
                    category_log(
                        f"[CATEGORY AUDIT] Restored from backup: {len(CATEGORY_CACHE)} shops"
                    )
                    return
        except Exception as e:
            category_log(f"[CATEGORY AUDIT] Failed to load backup file: {e}")

    # Fresh start
    category_log("[CATEGORY AUDIT] Starting fresh audit cache")
    CATEGORY_CACHE = defaultdict(dict)


def save_category_cache():
    """Persist category audit to disk."""
    with _cache_lock:
        try:
            CATEGORY_AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)
            cache_to_save = {k: dict(v) for k, v in CATEGORY_CACHE.items()}

            with CATEGORY_AUDIT_FILE.open("w", encoding="utf-8") as f:
                json.dump(cache_to_save, f, indent=2, ensure_ascii=False)

            with CATEGORY_AUDIT_BACKUP.open("w", encoding="utf-8") as f:
                json.dump(cache_to_save, f, indent=2, ensure_ascii=False)

            return True
        except Exception as e:
            category_log(f"[CATEGORY AUDIT] Failed to save audit file: {e}")
            return False


def normalize_raw_category(text: str) -> str:
    """Canonical form for raw category comparison."""
    return (text or "").strip().lower()


# =========================
# Django Management Command
# =========================
class Command(BaseCommand):
    help = "Normalize product categories using OpenAI and maintain audit cache"

    def add_arguments(self, parser):
        parser.add_argument(
            "--product-id", type=int, help="Normalize a specific product ID"
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limit number of products to process (0 for all)",
        )
        parser.add_argument(
            "--shop", type=str, help="Process only products from specific shop"
        )
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database to use (default: default)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be done without making changes",
        )
        parser.add_argument(
            "--debug-cache",
            action="store_true",
            help="Show cache statistics and debug info",
        )
        parser.add_argument(
            "--backup-cache",
            action="store_true",
            help="Create a manual backup of the cache",
        )
        parser.add_argument(
            "--repair-cache",
            action="store_true",
            help="Attempt to repair corrupted cache",
        )
        parser.add_argument(
            "--reload-cache", action="store_true", help="Force reload cache from disk"
        )
        parser.add_argument(
            "--skip-audit",
            action="store_true",
            help="Skip audit cache and always use OpenAI (expensive!)",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Verbose output showing every product",
        )

    def handle(self, *args, **options):
        # Cache management commands
        if options["debug_cache"]:
            self.debug_cache()
            return

        if options["backup_cache"]:
            self.backup_cache()
            return

        if options["repair_cache"]:
            self.repair_cache()
            return

        if options["reload_cache"]:
            _load_category_cache()
            category_log("[CATEGORY AUDIT] Cache reloaded from disk")
            return

        # Load cache
        _load_category_cache()

        # Process products
        if options["product_id"]:
            self.process_single_product(
                product_id=options["product_id"],
                db=options["db"],
                dry_run=options["dry_run"],
                skip_audit=options["skip_audit"],
                verbose=options["verbose"],
            )
        else:
            self.process_batch(
                limit=options["limit"],
                shop=options["shop"],
                db=options["db"],
                dry_run=options["dry_run"],
                skip_audit=options["skip_audit"],
                verbose=options["verbose"],
            )

    def process_single_product(self, product_id, db, dry_run, skip_audit, verbose):
        """Process a single product ID."""
        try:
            product = Product.objects.using(db).get(id=product_id)
        except Product.DoesNotExist:
            category_log(f"[{db}] Product {product_id} not found")
            return

        if verbose:
            category_log(f"[{db}] Processing Product #{product_id}: {product.name}")
            category_log(f"[{db}] Shop: {product.shop}")
            category_log(f"[{db}] Current category: {product.category}")

        if dry_run:
            category_log(f"[{db}] DRY RUN - Would process product {product_id}")
            return

        # Initialize OpenAI client
        env = environ.Env()
        environ.Env.read_env()
        client = OpenAI(api_key=env("OPENAI_API_KEY"))

        result = self.normalize_product(product, db, skip_audit, client)
        category_log(result)

    def process_batch(self, limit, shop, db, dry_run, skip_audit, verbose):
        """Process multiple products."""
        # Initialize OpenAI client
        env = environ.Env()
        environ.Env.read_env()
        client = OpenAI(api_key=env("OPENAI_API_KEY"))

        # Build query
        queryset = (
            Product.objects.using(db)
            .filter(category__isnull=False)
            .exclude(category="")
        )

        if shop:
            queryset = queryset.filter(shop__iexact=shop)

        if limit > 0:
            queryset = queryset[:limit]

        total_products = queryset.count()

        if dry_run:
            category_log(f"[{db}] DRY RUN - Would process {total_products} products")
            if verbose:
                for product in queryset:
                    category_log(
                        f"[{db}] Would process: {product.id} - {product.name} - {product.category}"
                    )
            return

        category_log(
            f"[{db}] Starting batch normalization for {total_products} products"
        )

        processed = 0
        skipped = 0
        errors = 0
        cached = 0
        new_normalizations = 0

        for product in queryset:
            try:
                result = self.normalize_product(product, db, skip_audit, client)

                if "already normalized" in result:
                    skipped += 1
                elif "reused from audit" in result:
                    cached += 1
                elif "normalized:" in result:
                    new_normalizations += 1
                else:
                    skipped += 1

                processed += 1

                if verbose:
                    category_log(result)

                # Log progress every 50 products
                if processed % 50 == 0:
                    category_log(
                        f"[{db}] Progress: {processed}/{total_products} processed"
                    )

            except Exception as e:
                errors += 1
                category_log(f"[{db}] Error processing product {product.id}: {e}")

        # Summary
        category_log(f"[{db}] Batch normalization completed:")
        category_log(f"[{db}]   Total products: {total_products}")
        category_log(f"[{db}]   Processed: {processed}")
        category_log(f"[{db}]   Skipped (already normalized): {skipped}")
        category_log(f"[{db}]   Reused from cache: {cached}")
        category_log(f"[{db}]   New normalizations: {new_normalizations}")
        category_log(f"[{db}]   Errors: {errors}")

        # Save cache if any changes were made
        if new_normalizations > 0 or cached > 0:
            save_category_cache()

    def normalize_product(self, product, db, skip_audit, client):
        """Normalize category for a single product."""
        shop = product.shop.lower()
        raw_category = product.category or ""
        raw_key = normalize_raw_category(raw_category)

        if not raw_key:
            return f"[{db}] {product.name} has empty category, skipped"

        old_category = product.category

        # =========================
        # AUDIT LOOKUP - Skip if requested or check cache
        # =========================
        if not skip_audit:
            with _cache_lock:
                shop_cache = CATEGORY_CACHE[shop]

                if raw_key in shop_cache:
                    # Cached entry exists, use it
                    cached = shop_cache[raw_key]

                    # Only update product if it differs from cached normalized value
                    if product.category != cached["normalized"]["ro"]:
                        product.category = cached["normalized"]["ro"]
                        product.t_category = cached["normalized"]
                        product.save(using=db)

                    # Track examples
                    examples = cached["examples"]
                    if product.id not in examples:
                        examples.append(product.id)

                    return f"[{db}] {product.name} category reused from audit: {old_category} -> {product.category}"

        # =========================
        # SKIP IF ALREADY NORMALIZED
        # =========================
        if old_category in [c["en"] for c in categories]:
            return f"[{db}] {product.name} already normalized"

        # =========================
        # OPENAI NORMALIZATION
        # =========================
        try:
            response = client.chat.completions.create(
                model="gpt-4-turbo-preview",  # Using a more reliable model
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a product categorization assistant. "
                            "Choose the best matching category for this product "
                            "from the following list and return translations "
                            "for ro, en, ru as JSON: "
                            f"{categories}"
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Product name: {product.name}\n"
                            f"Variant: {product.variant}\n"
                            f"Raw category: {raw_category}\n"
                            'Return JSON only: {"ro": "...", "en": "...", "ru": "..."}'
                        ),
                    },
                ],
                temperature=0.1,  # Lower temperature for more consistent results
            )

            ai_output = response.choices[0].message.content.strip()
            t_category = json.loads(ai_output)
            if not all(lang in t_category for lang in ("ro", "en", "ru")):
                raise ValueError("Incomplete category JSON from OpenAI")

        except Exception as e:
            error_msg = f"[{db}] OpenAI failed for {product.name}: {e}"
            category_log(error_msg)
            raise Exception(error_msg)

        # =========================
        # SAVE TO DB AND CREATE AUDIT ENTRY
        # =========================
        product.category = t_category["ro"]
        product.t_category = t_category
        product.save(using=db)

        with _cache_lock:
            # Create new audit entry
            CATEGORY_CACHE[shop][raw_key] = {
                "normalized": t_category,
                "first_seen": timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
                "examples": [product.id],
            }

        return f"[{db}] {product.external_id} {product.name} category normalized: {old_category} -> {product.category}"

    def debug_cache(self):
        """Show cache statistics and debug info."""
        with _cache_lock:
            # Count stats
            total_shops = len(CATEGORY_CACHE)
            total_entries = sum(len(shop_data) for shop_data in CATEGORY_CACHE.values())
            total_examples = sum(
                len(entry.get("examples", []))
                for shop_data in CATEGORY_CACHE.values()
                for entry in shop_data.values()
            )

            category_log("[CATEGORY AUDIT DEBUG] === Cache Statistics ===")
            category_log(f"[CATEGORY AUDIT DEBUG] Shops: {total_shops}")
            category_log(f"[CATEGORY AUDIT DEBUG] Category mappings: {total_entries}")
            category_log(f"[CATEGORY AUDIT DEBUG] Example products: {total_examples}")

            if CATEGORY_AUDIT_FILE.exists():
                file_size = CATEGORY_AUDIT_FILE.stat().st_size
                category_log(f"[CATEGORY AUDIT DEBUG] File size: {file_size} bytes")
                category_log(
                    f"[CATEGORY AUDIT DEBUG] File path: {CATEGORY_AUDIT_FILE.absolute()}"
                )

            # Check for empty cache
            if not CATEGORY_CACHE:
                category_log("[CATEGORY AUDIT DEBUG] WARNING: Cache is empty!")
            else:
                # Show first few entries for each shop
                for shop_name, shop_data in list(CATEGORY_CACHE.items())[:5]:
                    category_log(
                        f"[CATEGORY AUDIT DEBUG] Shop '{shop_name}': {len(shop_data)} entries"
                    )
                    for raw_key, entry in list(shop_data.items())[:3]:
                        normalized = entry.get("normalized", {})
                        examples = entry.get("examples", [])
                        category_log(
                            f"  '{raw_key}' -> '{normalized.get('ro', 'N/A')}' ({len(examples)} examples)"
                        )

            category_log("[CATEGORY AUDIT DEBUG] =========================")

    def backup_cache(self):
        """Create a manual backup of the cache."""
        with _cache_lock:
            try:
                cache_to_save = {k: dict(v) for k, v in CATEGORY_CACHE.items()}
                CATEGORY_AUDIT_BACKUP.parent.mkdir(parents=True, exist_ok=True)
                with CATEGORY_AUDIT_BACKUP.open("w", encoding="utf-8") as f:
                    json.dump(cache_to_save, f, indent=2, ensure_ascii=False)
                category_log("[CATEGORY AUDIT] Manual backup created successfully")
            except Exception as e:
                category_log(f"[CATEGORY AUDIT] Failed to create backup: {e}")

    def repair_cache(self):
        """Attempt to repair corrupted cache."""
        with _cache_lock:
            category_log("[CATEGORY AUDIT] Attempting cache repair...")

            # Try to load and validate the file
            if CATEGORY_AUDIT_FILE.exists():
                try:
                    with CATEGORY_AUDIT_FILE.open("r", encoding="utf-8") as f:
                        data = json.load(f)

                    # Validate and repair structure
                    if isinstance(data, dict):
                        # Convert to defaultdict
                        repaired = defaultdict(dict)
                        for shop, shop_data in data.items():
                            if isinstance(shop_data, dict):
                                repaired[shop] = shop_data

                        global CATEGORY_CACHE
                        CATEGORY_CACHE = repaired

                        # Save repaired version
                        save_category_cache()
                        category_log(
                            f"[CATEGORY AUDIT] Repair successful: {len(CATEGORY_CACHE)} shops restored"
                        )
                        return
                except Exception as e:
                    category_log(f"[CATEGORY AUDIT] Repair failed: {e}")

            category_log("[CATEGORY AUDIT] Could not repair cache")
