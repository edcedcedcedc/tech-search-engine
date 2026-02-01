from elasticsearch import helpers
from products.models import Product
from products.utils.es_index import es, create_index
from products.utils.log.autocomplete_log import autocomplete_log


class AutocompleteIndexer:
    LANGUAGES = ["en", "ro"]
    BULK_SIZE = 1000

    def build_index(self):
        for lang in self.LANGUAGES:
            create_index(lang)
            index_name = f"products_autocomplete_{lang}"

            autocomplete_log(f"Clearing existing documents in {index_name}...")
            es.delete_by_query(
                index=index_name,
                body={"query": {"match_all": {}}},
                refresh=True,
            )

            autocomplete_log(f"Building index {index_name}...")

            actions = []
            total = 0
            qs = Product.objects.only("id", "t_name")

            seen_names = set()  # deduplicate identical names

            for p in qs.iterator(chunk_size=self.BULK_SIZE):
                if not p.t_name:
                    continue

                name = p.t_name.get(lang)
                if not name:
                    continue

                normalized_name = name.lower().strip()
                if not normalized_name:
                    continue

                if normalized_name in seen_names:
                    continue
                seen_names.add(normalized_name)

                actions.append(
                    {
                        "_index": index_name,
                        "_id": p.id,
                        "_source": {
                            "name": normalized_name,
                            "product_id": p.id,
                        },
                    }
                )

                if len(actions) >= self.BULK_SIZE:
                    helpers.bulk(es, actions)
                    total += len(actions)
                    actions.clear()

            if actions:
                helpers.bulk(es, actions)
                total += len(actions)

            autocomplete_log(f"Indexed {total} products into {index_name}.")
