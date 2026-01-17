# products/management/commands/autocomplete_es_build.py
from collections import defaultdict
from django.core.management.base import BaseCommand
from elasticsearch import helpers
from products.models import Product
from products.utils.es_index import es, INDEX_NAME, create_index
from products.utils.utils import tokenize
from products.utils.log.autocomplete_log import autocomplete_log

MAX_CONTEXT = 3
BULK_SIZE = 1000


class Command(BaseCommand):
    help = "Build Elasticsearch autocomplete index (FAST)"

    def handle(self, *args, **kwargs):
        create_index()

        counter = defaultdict(int)

        qs = Product.objects.all().only("name", "variant", "brand", "category")

        for p in qs.iterator(chunk_size=1000):
            for text in (p.name, p.variant, p.brand, p.category):
                tokens = tokenize(text)
                for i in range(1, len(tokens)):
                    for ctx_len in range(0, MAX_CONTEXT + 1):
                        start = max(0, i - ctx_len)
                        context = " ".join(tokens[start:i])
                        next_token = tokens[i]
                        counter[(context, next_token)] += 1

        actions = []
        total = 0

        for (context, next_token), count in counter.items():
            actions.append(
                {
                    "_index": INDEX_NAME,
                    "_source": {
                        "context": context,
                        "next_token": next_token,
                        "count": count,
                    },
                }
            )

            if len(actions) >= BULK_SIZE:
                helpers.bulk(es, actions)
                total += len(actions)
                actions.clear()

        if actions:
            helpers.bulk(es, actions)
            total += len(actions)

        # 🔁 re-enable refresh
        es.indices.put_settings(
            index=INDEX_NAME, body={"index": {"refresh_interval": "1s"}}
        )

        autocomplete_log(f"Indexed {total} autocomplete rows into Elasticsearch.")
