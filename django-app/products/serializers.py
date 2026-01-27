from rest_framework import serializers


class OfferSerializer(serializers.Serializer):
    id = serializers.IntegerField()  # DB primary key
    external_id = serializers.CharField()
    name = serializers.CharField()
    variant = serializers.CharField(allow_blank=True)
    t_name = serializers.JSONField()
    t_variant = serializers.JSONField()
    shop = serializers.CharField()
    price = serializers.FloatField()
    url = serializers.URLField()
    brand = serializers.CharField()
    in_stock = serializers.BooleanField(default=True)
    offer_score = serializers.FloatField()


class AggregatedProductSerializer(serializers.Serializer):
    id = serializers.CharField()  # Generated cluster ID
    name = serializers.CharField()
    variant = serializers.CharField(allow_blank=True)
    t_name = serializers.JSONField()
    t_variant = serializers.JSONField()
    brand = serializers.CharField()
    t_category = serializers.JSONField()
    offers = OfferSerializer(many=True)
    lowest_price = serializers.FloatField()
    relevance = serializers.FloatField()
    product_score = serializers.FloatField()
    image = serializers.URLField(allow_blank=True, required=False)
    shops = serializers.SerializerMethodField()

    def get_shops(self, obj):
        """
        Return the unique list of shops for this aggregated product cluster.
        Preserves order of first appearance.
        """
        seen = set()
        unique_shops = []
        for offer in obj["offers"]:  # obj is a dict from build_aggregated_product
            shop = offer["shop"]
            if shop not in seen:
                seen.add(shop)
                unique_shops.append(shop)
        return unique_shops
