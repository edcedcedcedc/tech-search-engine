from django.db import models


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
        max_length=16,
        choices=[
            ("created", "created"),
            ("updated", "updated"),
        ],
        null=True,
        blank=True,
    )

    changed_fields = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.brand})"

    class Meta:
        unique_together = ("shop", "external_id")


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


class ArchivedProduct(models.Model):
    original_id = models.IntegerField(db_index=True)
    external_id = models.CharField(max_length=50)
    canonical_id = models.CharField(max_length=40, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    variant = models.CharField(max_length=50, null=True, blank=True)

    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    in_stock = models.BooleanField(default=False)
    shop = models.CharField(max_length=50)

    archived_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["external_id"]),
            models.Index(fields=["canonical_id"]),
            models.Index(fields=["shop"]),
        ]
