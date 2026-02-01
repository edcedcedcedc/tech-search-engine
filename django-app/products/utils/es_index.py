from elasticsearch import Elasticsearch
from django.conf import settings

es = Elasticsearch(settings.ELASTICSEARCH_HOSTS)

INDEX_NAME = "products_autocomplete"


def create_index(lang: str):
    index_name = f"{INDEX_NAME}_{lang}"

    if es.indices.exists(index=index_name):
        return

    body = {
        "mappings": {
            "properties": {
                "name": {"type": "search_as_you_type"},
                "product_id": {"type": "integer"},
            }
        }
    }

    es.indices.create(index=index_name, body=body)
