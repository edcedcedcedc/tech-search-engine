from rest_framework import serializers


class OfferSerializer(serializers.Serializer):
    id = serializers.IntegerField()  # DB primary key
    external_id = serializers.CharField()
    name = serializers.CharField()
    variant = serializers.CharField(allow_blank=True)
    t_name = serializers.JSONField()
    t_variant = serializers.JSONField()
    shop = serializers.CharField()
    price = serializers.IntegerField()
    url = serializers.URLField()
    brand = serializers.CharField()
    in_stock = serializers.BooleanField(default=True)


class AggregatedProductSerializer(serializers.Serializer):
    id = serializers.CharField()  # Generated cluster ID
    name = serializers.CharField()
    variant = serializers.CharField(allow_blank=True)
    t_name = serializers.JSONField()
    t_variant = serializers.JSONField()
    brand = serializers.CharField()
    category = serializers.CharField()
    offers = OfferSerializer(many=True)
    lowest_price = serializers.IntegerField()
    relevance = serializers.IntegerField()
    image = serializers.URLField(allow_blank=True, required=False)
