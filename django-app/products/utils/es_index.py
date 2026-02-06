# products/utils/es_index.py
from elasticsearch import Elasticsearch
from django.conf import settings

es = Elasticsearch(settings.ELASTICSEARCH_HOSTS)

INDEX_NAME = "products_autocomplete"


def create_index(lang: str):
    index_name = f"{INDEX_NAME}_{lang}"

    if es.indices.exists(index=index_name):
        es.indices.delete(index=index_name)

    body = {
        "settings": {
            # "index": {"knn": True}, till 100k products O(n) then will be O(n log n)
            "analysis": {
                "analyzer": {
                    "ro_autocomplete": {
                        "tokenizer": "standard",
                        "filter": ["lowercase", "asciifolding"],
                    }
                }
            },
        },
        "mappings": {
            "properties": {
                "name": {
                    "type": "search_as_you_type",
                    "analyzer": "ro_autocomplete",
                    "search_analyzer": "ro_autocomplete",
                },
                "name_raw": {"type": "keyword"},
                "embedding": {
                    "type": "dense_vector",
                    "dims": 1536,
                    "index": True,
                    "similarity": "cosine",
                },
                "product_id": {"type": "integer"},
            }
        },
    }

    es.indices.create(index=index_name, body=body)
