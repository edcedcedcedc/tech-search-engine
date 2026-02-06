"""from elasticsearch import Elasticsearch
from django.conf import settings

es = Elasticsearch(settings.ELASTICSEARCH_HOSTS)

INDEX_NAME = "products_autocomplete"


def create_index():
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)

    body = {
        "settings": {
            "analysis": {
                "analyzer": {
                    "autocomplete": {
                        "tokenizer": "autocomplete_tokenizer",
                        "filter": ["lowercase"],
                    }
                },
                "tokenizer": {
                    "autocomplete_tokenizer": {
                        "type": "edge_ngram",
                        "min_gram": 1,
                        "max_gram": 20,
                        "token_chars": ["letter", "digit"],
                    }
                },
            }
        },
        "mappings": {
            "properties": {
                "name": {"type": "text", "analyzer": "autocomplete"},
                "variant": {"type": "text", "analyzer": "autocomplete"},
                "brand": {"type": "text", "analyzer": "autocomplete"},
                "category": {"type": "text", "analyzer": "autocomplete"},
            }
        },
    }

    es.indices.create(index=INDEX_NAME, body=body)
    print("Index created:", INDEX_NAME)

"""

# products/utils/es_index.py
from elasticsearch import Elasticsearch
from django.conf import settings

es = Elasticsearch(settings.ELASTICSEARCH_HOSTS)
INDEX_NAME = "products_autocomplete"


def create_index():
    if es.indices.exists(index=INDEX_NAME):
        return

    body = {
        "settings": {
            "refresh_interval": "-1",
            "analysis": {
                "analyzer": {
                    "autocomplete": {
                        "tokenizer": "autocomplete_tokenizer",
                        "filter": ["lowercase"],
                    }
                },
                "tokenizer": {
                    "autocomplete_tokenizer": {
                        "type": "edge_ngram",
                        "min_gram": 1,
                        "max_gram": 20,
                        "token_chars": ["letter", "digit"],
                    }
                },
            },
        },
        "mappings": {
            "properties": {
                "context": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                "next_token": {
                    "type": "text",
                    "analyzer": "autocomplete",
                    "fields": {"keyword": {"type": "keyword"}},
                },
                "count": {"type": "integer"},
            }
        },
    }

    es.indices.create(index=INDEX_NAME, body=body)
