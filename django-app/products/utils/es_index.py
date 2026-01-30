# products/utils/es_index.py
from elasticsearch import Elasticsearch
from django.conf import settings

es = Elasticsearch(settings.ELASTICSEARCH_HOSTS)

INDEX_NAME = "products_autocomplete"


def create_index(lang: str):
    index_name = f"{INDEX_NAME}_{lang}"

    # if exists, do nothing (safe)
    if es.indices.exists(index=index_name):
        return

    body = {
        "settings": {
            "analysis": {
                "analyzer": {
                    "lowercase_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase"],
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                "suggest": {
                    "type": "completion",
                    "analyzer": "lowercase_analyzer",
                    "preserve_separators": True,
                    "preserve_position_increments": True,
                    "max_input_length": 150,
                },
                "product_id": {"type": "integer"},
            }
        },
    }

    es.indices.create(index=index_name, body=body)
