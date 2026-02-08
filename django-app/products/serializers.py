from rest_framework import serializers
from .models import Email


class PriceHistoryPreviewSerializer(serializers.Serializer):
    price = serializers.FloatField()
    in_stock = serializers.BooleanField()
    recorded_at = serializers.DateTimeField()


class PriceTrendSerializer(serializers.Serializer):
    free_price_trend = PriceHistoryPreviewSerializer(many=True)
    hidden_price_trend_count = serializers.IntegerField()


class OfferSerializer(serializers.Serializer):
    id = serializers.CharField()  # ID may be string if clustered
    external_id = serializers.CharField(allow_blank=True, required=False)
    name = serializers.CharField()
    variant = serializers.CharField(allow_blank=True)
    t_name = serializers.JSONField(default=dict)
    t_variant = serializers.JSONField(default=dict)
    t_category = serializers.JSONField(default=dict)
    shop = serializers.CharField()
    price = serializers.FloatField()
    url = serializers.URLField(allow_blank=True, required=False)
    brand = serializers.CharField(allow_blank=True, required=False)
    in_stock = serializers.BooleanField(default=True)
    offer_score = serializers.FloatField(default=0.0)
    price_history = PriceHistoryPreviewSerializer(
        many=True, required=False, default=list
    )
    price_trend_preview = PriceTrendSerializer(required=False)
    embedding = serializers.CharField(allow_blank=True, required=False)
    query = serializers.CharField(allow_blank=True, required=False)
    query_embedding = serializers.CharField(allow_blank=True, required=False)


class AggregatedProductSerializer(serializers.Serializer):
    id = serializers.CharField()  # Cluster ID
    name = serializers.CharField()
    variant = serializers.CharField(allow_blank=True)
    t_name = serializers.JSONField(default=dict)
    t_variant = serializers.JSONField(default=dict)
    brand = serializers.CharField(allow_blank=True, required=False)
    t_category = serializers.JSONField(default=dict)
    offers = OfferSerializer(many=True)
    lowest_price = serializers.FloatField()
    relevance = serializers.FloatField(default=0.0)
    product_score = serializers.FloatField(default=0.0)
    image = serializers.URLField(allow_blank=True, required=False)
    shops = serializers.SerializerMethodField()
    embedding = serializers.CharField(allow_blank=True, required=False)
    query = serializers.CharField(allow_blank=True, required=False)
    query_embedding = serializers.CharField(allow_blank=True, required=False)

    def get_shops(self, obj):
        seen = set()
        unique_shops = []
        for offer in obj.get("offers", []):
            shop = offer.get("shop")
            if shop and shop not in seen:
                seen.add(shop)
                unique_shops.append(shop)
        return unique_shops


class EmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Email
        fields = ["email"]
