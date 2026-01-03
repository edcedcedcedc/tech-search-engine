# backend/serializers.py
from rest_framework import serializers
from .models import Product


class OfferSerializer(serializers.Serializer):
    shop = serializers.CharField()
    price = serializers.IntegerField()
    url = serializers.URLField()
    external_id = serializers.CharField()
    name = serializers.CharField()
    brand = serializers.CharField()
    variant = serializers.CharField(allow_blank=True)
    stock = serializers.BooleanField(default=True)


class AggregatedProductSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    brand = serializers.CharField()
    category = serializers.CharField()
    variant = serializers.CharField(allow_blank=True)
    offers = OfferSerializer(many=True)
    lowest_price = serializers.IntegerField()
    relevance = serializers.IntegerField()
    image = serializers.URLField(allow_blank=True, required=False)
