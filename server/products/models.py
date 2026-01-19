from django.db import transaction
from django.db import models

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

    change_type = models.CharField(
        max_length=32,
        choices=[
            ("created", "created"),
            ("updated", "updated"),
            ("restored", "restored"),
            ("restored_from_broken", "restored_from_broken"),
        ],
        null=True,
        blank=True,
    )

    changed_fields = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.brand})"

    class Meta:
        unique_together = ("shop", "external_id")

    def archive(self):
        """
        Explicitly archive this product. Moves price history to ArchivedProduct.
        Does NOT delete the Product immediately.
        """
        from products.models import ArchivedProduct, ProductPriceHistory

        try:
            with transaction.atomic():
                archived = ArchivedProduct.objects.create(
                    original_id=self.id,
                    external_id=self.external_id,
                    canonical_id=self.canonical_id,
                    name=self.name,
                    variant=self.variant,
                    price=self.price,
                    in_stock=self.in_stock,
                    shop=self.shop,
                )

                # Move price history to archived product
                ProductPriceHistory.objects.filter(product=self).update(
                    product=None, archived_product=archived
                )
                return archived
        except Exception as e:
            shop_crawler_log(
                f"ERROR archiving product {self.name} ({self.external_id}): {e}"
            )
            return None


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
