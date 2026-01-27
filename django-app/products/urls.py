# products/urls.py
from django.urls import path
from products.search.layer2 import (
    ProductOffersAPIView,
)
from products.search.layer1 import (
    SearchAPIView,
)
from products.search.autocomplete import (
    AutocompleteAPIView,
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
