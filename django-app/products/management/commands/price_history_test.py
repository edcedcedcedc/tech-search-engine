from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count, Q
import random
from products.models import (
    Product,
    ArchivedProduct,
    ArchivedBrokenProduct,
    ProductPriceHistory,
)
from products.utils.log.price_history_log import price_history_log


class Command(BaseCommand):
    help = "Test price history after pipeline run"

    def add_arguments(self, parser):
        parser.add_argument(
            "--samples",
            type=int,
            default=10,
            help="Number of random products to sample",
        )
        parser.add_argument(
            "--db",
            type=str,
            default="default",
            help="Database to test (default: 'default')",
        )

    def handle(self, *args, **options):
        samples = options["samples"]
        db = options["db"]

        price_history_log(f"[TEST] Starting price history test for DB: {db}")

        # Get random products
        all_product_ids = list(Product.objects.using(db).values_list("id", flat=True))

        if not all_product_ids:
            price_history_log("[TEST] No products found!")
            return

        # Sample random products
        sample_ids = random.sample(all_product_ids, min(samples, len(all_product_ids)))
        products = Product.objects.using(db).filter(id__in=sample_ids)

        price_history_log(f"[TEST] Testing {len(products)} random products")

        # Test 1: Basic checks
        self.test_basic_checks(products, db)

        # Test 2: Price history consistency
        self.test_price_history_consistency(db)

        # Test 3: Archived products
        self.test_archived_products(db)

        price_history_log("[TEST] Price history test completed")

    def test_basic_checks(self, products, db):
        """Basic sanity checks"""
        price_history_log("\n=== BASIC CHECKS ===")

        # Check 1: Every product should have at least 1 history entry
        products_without_history = []
        for product in products:
            history_count = product.price_history.using(db).count()
            if history_count == 0:
                products_without_history.append(product.name)
            elif history_count == 1:
                price_history_log(f"  ✓ {product.name}: Has 1 history entry")
            else:
                price_history_log(
                    f"  ✓ {product.name}: Has {history_count} history entries (PRICE CHANGES!)"
                )

        if products_without_history:
            price_history_log(
                f"  ✗ {len(products_without_history)} products have NO history: {', '.join(products_without_history[:3])}"
            )

        # Check 2: Latest history should match current price
        mismatches = []
        for product in products:
            latest_history = (
                product.price_history.using(db).order_by("-recorded_at").first()
            )
            if latest_history:
                if latest_history.price != product.price:
                    mismatches.append(
                        {
                            "product": product.name,
                            "product_price": product.price,
                            "history_price": latest_history.price,
                            "difference": abs(product.price - latest_history.price),
                        }
                    )

        if mismatches:
            price_history_log(f"  ✗ Found {len(mismatches)} price mismatches!")
            for m in mismatches[:3]:
                price_history_log(
                    f"    - {m['product']}: Product=${m['product_price']}, History=${m['history_price']} (diff: ${m['difference']})"
                )
        else:
            price_history_log("  ✓ All latest history matches current prices")

    def test_price_history_consistency(self, db):
        """Check price history data quality"""
        price_history_log("\n=== PRICE HISTORY CONSISTENCY ===")

        # Check 1: No duplicate timestamps for same product (ALL TYPES)
        # Active products
        active_duplicates = (
            ProductPriceHistory.objects.using(db)
            .filter(product__isnull=False)
            .values("product_id", "recorded_at")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .count()
        )

        # Archived products
        archived_duplicates = (
            ProductPriceHistory.objects.using(db)
            .filter(archived_product__isnull=False)
            .values("archived_product_id", "recorded_at")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .count()
        )

        # Broken products
        broken_duplicates = (
            ProductPriceHistory.objects.using(db)
            .filter(archived_broken_product__isnull=False)
            .values("archived_broken_product_id", "recorded_at")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .count()
        )

        total_duplicates = active_duplicates + archived_duplicates + broken_duplicates

        if total_duplicates > 0:
            price_history_log(f"  ✗ Found {total_duplicates} duplicate timestamps!")
            if active_duplicates > 0:
                price_history_log(
                    f"    - Active products: {active_duplicates} duplicates"
                )
            if archived_duplicates > 0:
                price_history_log(
                    f"    - Archived products: {archived_duplicates} duplicates"
                )
            if broken_duplicates > 0:
                price_history_log(
                    f"    - Broken products: {broken_duplicates} duplicates"
                )
        else:
            price_history_log("  ✓ No duplicate timestamps")

        # Check 2: History should be chronological (for all products)
        chronological_errors = 0

        # Check active products
        active_errors = self._check_chronological_for_type(db, "product")
        # Check archived products
        archived_errors = self._check_chronological_for_type(db, "archived_product")
        # Check broken products
        broken_errors = self._check_chronological_for_type(
            db, "archived_broken_product"
        )

        chronological_errors = active_errors + archived_errors + broken_errors

        if chronological_errors > 0:
            price_history_log(f"  ✗ Found {chronological_errors} chronological errors!")
        else:
            price_history_log("  ✓ All history is chronological")

        # Check 3: Products with multiple entries (show price changes)
        # Count active products with multiple entries
        active_multi = (
            ProductPriceHistory.objects.using(db)
            .filter(product__isnull=False)
            .values("product_id")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .count()
        )

        # Count archived products with multiple entries
        archived_multi = (
            ProductPriceHistory.objects.using(db)
            .filter(archived_product__isnull=False)
            .values("archived_product_id")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .count()
        )

        # Count broken products with multiple entries
        broken_multi = (
            ProductPriceHistory.objects.using(db)
            .filter(archived_broken_product__isnull=False)
            .values("archived_broken_product_id")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .count()
        )

        total_multi = active_multi + archived_multi + broken_multi

        price_history_log(
            f"  ✓ {total_multi} products have multiple price entries (showing changes)"
        )

    def _check_chronological_for_type(self, db, field_name):
        """Helper to check chronological order for a specific foreign key field"""
        errors = 0

        # Get all distinct product IDs for this type
        if field_name == "product":
            product_ids = (
                ProductPriceHistory.objects.using(db)
                .filter(product__isnull=False)
                .values_list("product_id", flat=True)
                .distinct()
            )
        elif field_name == "archived_product":
            product_ids = (
                ProductPriceHistory.objects.using(db)
                .filter(archived_product__isnull=False)
                .values_list("archived_product_id", flat=True)
                .distinct()
            )
        else:  # archived_broken_product
            product_ids = (
                ProductPriceHistory.objects.using(db)
                .filter(archived_broken_product__isnull=False)
                .values_list("archived_broken_product_id", flat=True)
                .distinct()
            )

        # Check each product's history
        for product_id in product_ids[:100]:  # Limit to first 100 for performance
            if field_name == "product":
                histories = (
                    ProductPriceHistory.objects.using(db)
                    .filter(product_id=product_id)
                    .order_by("recorded_at")
                )
            elif field_name == "archived_product":
                histories = (
                    ProductPriceHistory.objects.using(db)
                    .filter(archived_product_id=product_id)
                    .order_by("recorded_at")
                )
            else:  # archived_broken_product
                histories = (
                    ProductPriceHistory.objects.using(db)
                    .filter(archived_broken_product_id=product_id)
                    .order_by("recorded_at")
                )

            histories_list = list(histories)
            for i in range(1, len(histories_list)):
                if histories_list[i].recorded_at <= histories_list[i - 1].recorded_at:
                    errors += 1
                    if errors >= 10:  # Stop after 10 errors
                        return errors

        return errors

    def test_archived_products(self, db):
        """Check archived products have history too"""
        price_history_log("\n=== ARCHIVED PRODUCTS ===")

        archived_count = ArchivedProduct.objects.using(db).count()
        price_history_log(f"  Total archived products: {archived_count}")

        # Check archived products have price history
        archived_with_history = (
            ArchivedProduct.objects.using(db)
            .filter(archived_price_history__isnull=False)
            .distinct()
            .count()
        )

        if archived_count > 0:
            price_history_log(
                f"  {archived_with_history}/{archived_count} archived products have price history"
            )

            # Show some archived products
            archived_samples = ArchivedProduct.objects.using(db).order_by("?")[:3]
            for archived in archived_samples:
                history_count = archived.archived_price_history.count()
                price_history_log(
                    f"    - {archived.name}: {history_count} history entries, archived at {archived.archived_at}"
                )
