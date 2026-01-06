# products/urls.py
from django.urls import path
from products.views.search_engine import (
    AutocompleteAPIView,
    SearchAPIView,
    ProductOffersAPIView,
)

urlpatterns = [
    path("api/search/", SearchAPIView.as_view(), name="search"),
    path(
        "api/product/<str:product_id>/offers/",
        ProductOffersAPIView.as_view(),
        name="product-offers",
    ),
    path("api/autocomplete/", AutocompleteAPIView.as_view(), name="autocomplete"),
]
