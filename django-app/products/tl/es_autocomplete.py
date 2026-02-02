import json
from elasticsearch import helpers
from django.db.models import QuerySet

from products.models import Product
from products.utils.es_index import es, create_index
from products.utils.log.autocomplete_log import autocomplete_log


LANGUAGES = ["en", "ro"]
BULK_SIZE = 1000
EMBEDDING_DIM = 1536


class AutocompleteIndexBuilder:
    """
    Builds hybrid autocomplete index (search_as_you_type + embeddings)
    """

    def __init__(self, languages=None, bulk_size=BULK_SIZE):
        self.languages = languages or LANGUAGES
        self.bulk_size = bulk_size

    def build_index(self):
        for lang in self.languages:
            self.build_for_language(lang)

    def build_for_language(self, lang: str):
        create_index(lang)
        index_name = f"products_autocomplete_{lang}"

        autocomplete_log(f"Clearing existing documents in {index_name}...")
        self._clear_index(index_name)

        autocomplete_log(f"Building index {index_name}...")
        total = self._index_products(index_name, lang)

        autocomplete_log(f"Indexed {total} products into {index_name}.")

    def _clear_index(self, index_name: str):
        es.delete_by_query(
            index=index_name,
            body={"query": {"match_all": {}}},
            refresh=True,
        )

    def _index_products(self, index_name: str, lang: str) -> int:
        actions = []
        total = 0
        seen_names: set[str] = set()

        qs: QuerySet = Product.objects.only("id", "t_name", "embedding")

        for product in qs.iterator(chunk_size=self.bulk_size):
            doc = self._build_document(product, lang, seen_names)
            if not doc:
                continue

            actions.append(doc)

            if len(actions) >= self.bulk_size:
                helpers.bulk(es, actions)
                total += len(actions)
                actions.clear()

        if actions:
            helpers.bulk(es, actions)
            total += len(actions)

        return total

    def _build_document(self, product: Product, lang: str, seen_names: set):
        if not product.t_name or not product.embedding:
            return None

        name = product.t_name.get(lang)
        if not name:
            return None

        normalized_name = name.strip()
        if not normalized_name or normalized_name in seen_names:
            return None

        embedding = self._parse_embedding(product.embedding)
        if embedding is None:
            return None

        seen_names.add(normalized_name)

        return {
            "_index": f"products_autocomplete_{lang}",
            "_id": product.id,
            "_source": {
                "name": normalized_name,
                "embedding": embedding,
                "product_id": product.id,
            },
        }

    def _parse_embedding(self, raw_embedding):
        """
        Convert TextField JSON → list[float] and validate dimension
        """
        try:
            raw = json.loads(raw_embedding)
            embedding = [float(x) for x in raw]
        except (TypeError, ValueError, json.JSONDecodeError):
            return None

        if len(embedding) != EMBEDDING_DIM:
            return None

        return embedding
