# products/urls.py
from django.urls import path
from .views import SearchAPIView, ProductOffersAPIView

urlpatterns = [
    path("search/", SearchAPIView.as_view(), name="search"),
    path(
        "product/<str:product_id>/offers/",
        ProductOffersAPIView.as_view(),
        name="product-offers",
    ),
]
