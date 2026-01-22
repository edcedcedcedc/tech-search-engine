from django.db import transaction
from django.db import models
from django.utils import timezone
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


""" 

Delete behavior

Deleting a Product → ProductPriceHistory survives because on_delete=SET_NULL.

Archiving a Product → price history is relinked to the ArchivedProduct.

Deleting an ArchivedProduct → same, history survives if needed (on_delete=SET_NULL).



Analytics and statistics are never lost.

You can explicitly control archiving without interfering with deletion.

Unique constraint prevents accidental duplicates.

Clear distinction between Product (current) and ArchivedProduct (past/out-of-stock).


 """


class Product(models.Model):
    external_id = models.CharField(max_length=50)
    canonical_id = models.CharField(
        max_length=40,
        db_index=True,
        null=True,
        blank=True,
    )

    name = models.CharField(max_length=255, null=True, blank=True)
    variant = models.CharField(max_length=50, null=True, blank=True)
    embedding = models.TextField(blank=True, null=True)

    price = models.IntegerField()
    brand = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    url = models.URLField()
    image = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    shop = models.CharField(max_length=50, default="")
    in_stock = models.BooleanField(default=True)
    t_name = models.JSONField(default=dict, null=True, blank=True)
    t_variant = models.JSONField(default=dict, null=True, blank=True)
    t_category = models.JSONField(default=dict, null=True, blank=True)

    # ---- PIPELINE CONTROL FIELDS ----
    dirty = models.BooleanField(default=False)  # "needs downstream processing"

    def __str__(self):
        return f"{self.name} ({self.brand})"

    class Meta:
        unique_together = ("shop", "external_id")

    def archive(self, db=None):
        """
        Archive this product, moving its price history to an ArchivedProduct.
        `db` can be PROD_DB, ENTER_DB, or any other Django database alias.
        """
        from products.models import ArchivedProduct, ProductPriceHistory

        db = db or "default"  # fallback if not specified

        try:
            with transaction.atomic(using=db):
                archived = ArchivedProduct.objects.using(db).create(
                    original_id=self.id,
                    external_id=self.external_id,
                    canonical_id=self.canonical_id,
                    name=self.name,
                    variant=self.variant,
                    price=self.price,
                    url=self.url,
                    in_stock=self.in_stock,
                    shop=self.shop,
                    archived_at=timezone.now(),
                )

                ProductPriceHistory.objects.using(db).create(
                    archived_product=archived,
                    product=None,  # not linked to active product
                    shop=self.shop,
                    price=self.price,
                    in_stock=self.in_stock,
                    recorded_at=timezone.now(),
                )

                return archived
        except Exception as e:
            shop_crawler_log(
                f"ERROR archiving product {self.name} ({self.external_id}) in DB '{db}': {e}"
            )
            return None

    def archive_broken(self, db=None):
        """
        Archive a product as broken (price=0) and create initial price history.
        """
        from products.models import ArchivedBrokenProduct, ProductPriceHistory
        from django.utils import timezone

        db = db or "default"

        try:
            with transaction.atomic(using=db):
                # Step 1: create ArchivedBrokenProduct
                archived_broken = ArchivedBrokenProduct.objects.using(db).create(
                    original_id=self.id,
                    external_id=self.external_id,
                    canonical_id=self.canonical_id or "",
                    name=self.name or "Unknown",
                    variant=self.variant,
                    price=0,
                    in_stock=False,
                    shop=self.shop,
                    archived_at=timezone.now(),
                    url=self.url or "",
                )

                # Step 2: create initial price history node
                ProductPriceHistory.objects.using(db).create(
                    archived_product=archived_broken,
                    product=None,
                    shop=self.shop,
                    price=0,
                    in_stock=False,
                    recorded_at=timezone.now(),
                )

                return archived_broken

        except Exception as e:
            shop_crawler_log(
                f"ERROR archiving broken product {self.name} ({self.external_id}) in DB '{db}': {e}"
            )
            return None

    def restore(self, db=None):
        """
        Restore this archived product back to an active Product.
        Moves its price history back to the Product.
        `db` can be PROD_DB, ENTER_DB, or any other Django database alias.
        """
        from products.models import Product, ProductPriceHistory

        db = db or "default"  # fallback if not specified

        try:
            with transaction.atomic(using=db):
                # Create a new active Product based on the archived one
                restored = Product.objects.using(db).create(
                    external_id=self.external_id,
                    canonical_id=self.canonical_id,
                    name=self.name,
                    variant=self.variant,
                    price=self.price,
                    in_stock=self.in_stock,
                    shop=self.shop,
                    created_at=timezone.now(),
                    updated_at=timezone.now(),
                )

                # Move price history back to active Product
                ProductPriceHistory.link_to_product(
                    ProductPriceHistory.objects.using(db).filter(archived_product=self),
                    restored,
                )

                return restored
        except Exception as e:
            shop_crawler_log(
                f"ERROR restoring archived product {self.name} ({self.external_id}) in DB '{db}': {e}"
            )
            return None

    BATCH_ARCHIVE_SIZE = 500

    @classmethod
    def archive_batch(cls, queryset, db=None):
        """
        Archive a queryset of products in batches, moving their price history
        to ArchivedProduct reliably.
        Returns a dict with counts: {"archived": X, "failed": Y}
        """
        from products.models import ArchivedProduct, ProductPriceHistory
        from django.utils import timezone

        db = db or "default"
        archived_count = 0
        failed_count = 0

        total = queryset.count()
        for start in range(0, total, cls.BATCH_ARCHIVE_SIZE):
            batch = list(queryset[start : start + cls.BATCH_ARCHIVE_SIZE])

            try:
                with transaction.atomic(using=db):
                    # Step 1: Create ArchivedProducts one by one to ensure IDs exist
                    archived_objs = []
                    for p in batch:
                        archived = ArchivedProduct.objects.using(db).create(
                            original_id=p.id,
                            external_id=p.external_id,
                            canonical_id=p.canonical_id,
                            name=p.name,
                            variant=p.variant,
                            price=p.price,
                            in_stock=p.in_stock,
                            shop=p.shop,
                            archived_at=timezone.now(),
                        )
                        archived_objs.append((p, archived))

                    # Step 2: Move price history
                    for p, archived in archived_objs:
                        ProductPriceHistory.objects.using(db).filter(product=p).update(
                            product=None, archived_product=archived
                        )

                    archived_count += len(batch)

            except Exception as e:
                failed_count += len(batch)
                for p in batch:
                    shop_crawler_log(
                        f"ERROR archiving product {p.name} ({p.external_id}) in DB '{db}': {e}"
                    )

        return {"archived": archived_count, "failed": failed_count}

    @classmethod
    def unarchive_batch(cls, archived_queryset, db=None):
        """
        Restore ArchivedProducts back to Product in batches.
        Moves price history back to Product.
        Returns a dict with counts: {"restored": X, "failed": Y}
        """
        from products.models import Product, ProductPriceHistory
        from django.utils import timezone

        db = db or "default"
        restored_count = 0
        failed_count = 0

        batch_size = cls.BATCH_ARCHIVE_SIZE

        total = archived_queryset.count()
        for start in range(0, total, batch_size):
            batch = list(archived_queryset[start : start + batch_size])

            try:
                with transaction.atomic(using=db):
                    restored_objs = []
                    for a in batch:
                        product = Product.objects.using(db).create(
                            external_id=a.external_id,
                            canonical_id=a.canonical_id,
                            name=a.name,
                            variant=a.variant,
                            price=a.price,
                            shop=a.shop,
                            in_stock=a.in_stock,
                            created_at=timezone.now(),
                            updated_at=timezone.now(),
                        )
                        restored_objs.append((a, product))

                    # Relink price history
                    for archived, product in restored_objs:
                        ProductPriceHistory.objects.using(db).filter(
                            archived_product=archived
                        ).update(product=product, archived_product=None)

                    restored_count += len(batch)

            except Exception as e:
                failed_count += len(batch)
                for a in batch:
                    shop_crawler_log(
                        f"ERROR unarchiving product {a.name} ({a.external_id}) in DB '{db}': {e}"
                    )

        return {"restored": restored_count, "failed": failed_count}


# store embeddings for user search queries
class UserQueryEmbedding(models.Model):
    query_text = models.TextField()
    embedding = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


# given a this query how similar is each product
class PrecomputedSimilarity(models.Model):
    user_query = models.ForeignKey(UserQueryEmbedding, on_delete=models.CASCADE)
    product = models.ForeignKey("Product", on_delete=models.CASCADE)
    similarity = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)


class AutocompleteToken(models.Model):
    context = models.CharField(max_length=255, db_index=True)
    next_token = models.CharField(max_length=64, db_index=True)
    count = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("context", "next_token")
        indexes = [
            models.Index(fields=["context"]),
            models.Index(fields=["next_token"]),
        ]

    def __str__(self):
        return f"{self.context} -> {self.next_token} ({self.count})"


class ArchivedBrokenProduct(models.Model):
    original_id = models.IntegerField(db_index=True, null=True)
    external_id = models.CharField(max_length=50)
    canonical_id = models.CharField(max_length=40, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    variant = models.CharField(max_length=50, null=True, blank=True)
    url = models.URLField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    in_stock = models.BooleanField(default=False)
    shop = models.CharField(max_length=50)

    archived_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("shop", "external_id")
        indexes = [
            models.Index(fields=["external_id"]),
            models.Index(fields=["canonical_id"]),
            models.Index(fields=["shop"]),
        ]


class ArchivedProduct(models.Model):
    original_id = models.IntegerField(db_index=True, null=True)
    external_id = models.CharField(max_length=50)
    canonical_id = models.CharField(max_length=40, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    variant = models.CharField(max_length=50, null=True, blank=True)
    url = models.URLField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    in_stock = models.BooleanField(default=False)
    shop = models.CharField(max_length=50)

    archived_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("shop", "external_id")
        indexes = [
            models.Index(fields=["external_id"]),
            models.Index(fields=["canonical_id"]),
            models.Index(fields=["shop"]),
        ]


class CrawlSnapshot(models.Model):
    shop = models.CharField(max_length=50)
    external_ids = models.JSONField(default=list)  # store list of strings
    created_at = models.DateTimeField(auto_now_add=True)


class ProductPriceHistory(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_history",
    )
    archived_product = models.ForeignKey(
        ArchivedProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="archived_price_history",
    )
    shop = models.CharField(
        max_length=50, db_index=True, null=True
    )  # <-- preserve shop

    price = models.DecimalField(max_digits=12, decimal_places=2)
    in_stock = models.BooleanField(default=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def link_to_product(history_qs, product):
        """
        Link a queryset of price history rows to a Product.
        Sets archived_product to None.
        """
        history_qs.update(product=product, archived_product=None)

    @staticmethod
    def link_to_archived(history_qs, archived):
        """
        Link a queryset of price history rows to an ArchivedProduct.
        Sets product to None.
        """
        history_qs.update(product=None, archived_product=archived)

    class Meta:
        indexes = [
            models.Index(fields=["shop", "recorded_at"]),
            models.Index(fields=["product", "recorded_at"]),
            models.Index(fields=["archived_product", "recorded_at"]),
        ]
        unique_together = (
            "product",
            "archived_product",
            "recorded_at",
        )
        ordering = ["-recorded_at"]

    def __str__(self):
        target = self.product or self.archived_product
        if target:
            return f"{target.name} | {self.price} at {self.recorded_at}"
        else:
            return f"Orphaned ({self.shop}) | {self.price} at {self.recorded_at}"


class ProductAnalytics(models.Model):
    product = models.OneToOneField(
        "Product",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="analytics",
    )
    archived_product = models.OneToOneField(
        "ArchivedProduct",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="analytics",
    )

    # Price metrics
    first_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    last_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    max_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    min_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    avg_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    price_change_count = models.IntegerField(default=0)

    # Stock metrics
    total_days_in_stock = models.IntegerField(default=0)
    total_days_out_of_stock = models.IntegerField(default=0)
    last_in_stock = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["archived_product"]),
        ]

    def __str__(self):
        target = self.product or self.archived_product
        return f"Analytics for {target.name} ({target.external_id})"
