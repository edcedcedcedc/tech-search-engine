from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count
import random
from products.models import Product, ProductPriceHistory, ArchivedProduct
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
        self.test_price_history_consistency(products, db)

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

    def test_price_history_consistency(self, products, db):
        """Check price history data quality"""
        price_history_log("\n=== PRICE HISTORY CONSISTENCY ===")

        # Check 1: No duplicate timestamps for same product
        duplicate_timestamps = (
            ProductPriceHistory.objects.using(db)
            .values("product_id", "recorded_at")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .count()
        )

        if duplicate_timestamps > 0:
            price_history_log(f"  ✗ Found {duplicate_timestamps} duplicate timestamps!")
        else:
            price_history_log("  ✓ No duplicate timestamps")

        # Check 2: History should be chronological
        chronological_errors = 0
        for product in products:
            histories = list(product.price_history.using(db).order_by("recorded_at"))
            for i in range(1, len(histories)):
                if histories[i].recorded_at <= histories[i - 1].recorded_at:
                    chronological_errors += 1

        if chronological_errors > 0:
            price_history_log(f"  ✗ Found {chronological_errors} chronological errors!")
        else:
            price_history_log("  ✓ All history is chronological")

        # Check 3: Products with multiple entries (show price changes)
        multi_history_products = (
            ProductPriceHistory.objects.using(db)
            .values("product_id")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .count()
        )

        price_history_log(
            f"  ✓ {multi_history_products} products have multiple price entries (showing changes)"
        )

        # Show some price change examples
        products_with_changes = []
        for product in products:
            histories = product.price_history.using(db).order_by("recorded_at")
            if histories.count() > 1:
                first_price = histories.first().price
                last_price = histories.last().price
                if first_price != last_price:
                    products_with_changes.append(
                        {
                            "name": product.name,
                            "changes": histories.count(),
                            "first": first_price,
                            "last": last_price,
                            "difference": last_price - first_price,
                        }
                    )

        if products_with_changes:
            price_history_log(
                f"  Found {len(products_with_changes)} products with actual price changes:"
            )
            for change in products_with_changes[:3]:
                trend = "↑" if change["difference"] > 0 else "↓"
                price_history_log(
                    f"    - {change['name']}: {change['changes']} entries, ${change['first']} → ${change['last']} ({trend}${abs(change['difference'])})"
                )

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
