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
from products.system_state.version import (
    SystemVersionAPIView,
)
from products.system_state.session import (
    FlushSessionAPIView,
)
from products.system_state.pipeline_status import (
    PipelineStatusAPIView,
)
from products.views import CollectEmailAPIView, RootAPIView

urlpatterns = [
    path("", RootAPIView.as_view(), name="root"),
    path("api/search/", SearchAPIView.as_view(), name="search"),
    path(
        "api/product/<str:product_id>/offers/",
        ProductOffersAPIView.as_view(),
        name="product-offers",
    ),
    path("api/autocomplete/", AutocompleteAPIView.as_view(), name="autocomplete"),
    path("api/email/", CollectEmailAPIView.as_view(), name="collect-email"),
    path("api/system/version/", SystemVersionAPIView.as_view(), name="system-version"),
    path("api/session/flush/", FlushSessionAPIView.as_view(), name="session-flush"),
    path(
        "api/system/pipeline-status/",
        PipelineStatusAPIView.as_view(),
        name="pipeline-status",
    ),
]
