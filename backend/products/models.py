from django.db import models

class Product(models.Model):
    external_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    price = models.IntegerField()
    brand = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    variant = models.CharField(max_length=50, blank=True)
    url = models.URLField()
    image = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    shop = models.CharField(max_length=50, default="Darwin")

    def __str__(self):
        return f"{self.name} ({self.brand})"