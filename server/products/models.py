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
    dirty = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.brand})"

    class Meta:
        unique_together = ("shop", "external_id")


class CategoryMapping(models.Model):
    shop = models.CharField(max_length=100)
    raw_category = models.CharField(max_length=255)
    unified_category = models.CharField(max_length=100)


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
