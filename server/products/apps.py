from django.apps import AppConfig
import threading
from products.utils.load_embeddings_cache_log import load_embeddings_cache_log


class ProductsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "products"

    def ready(self):
        from products.utils import embeddings_cache
        import os

        # Only run in the main autoreload process
        if os.environ.get("RUN_MAIN") != "true":
            return
        if embeddings_cache.PRODUCT_IDS is not None:
            return  # already loaded in this process

        def preload_embeddings():
            try:
                load_embeddings_cache_log("[Startup] Preloading product embeddings...")
                embeddings_cache.load_embeddings_cache()
                load_embeddings_cache_log("[Startup] Product embeddings loaded.")
            except Exception as e:
                load_embeddings_cache_log(f"[Startup] Failed to load embeddings: {e}")

        threading.Thread(target=preload_embeddings, daemon=True).start()
