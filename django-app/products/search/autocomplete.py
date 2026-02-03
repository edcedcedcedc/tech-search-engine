# api/views/autocomplete.py
from rest_framework.views import APIView
from rest_framework.response import Response
from products.utils.es_index import es, INDEX_NAME
from products.search.config import AUTOCOMPLETE_LIMIT


class AutocompleteAPIView(APIView):
    def get(self, request):
        raw = request.GET.get("q", "")
        lang = request.GET.get("lang", "en")

        if not raw:
            return Response({"suggestions": []})

        suggestions = self._lookup(raw, lang=lang)
        return Response({"suggestions": suggestions})

    def _lookup(self, user_input, lang="en"):
        """
        Hybrid Elasticsearch autocomplete:
        Combines prefix matching with all-token matching + boosts
        to ensure relevant terms like '4K' rank higher.
        """
        index_name = f"{INDEX_NAME}_{lang}" if lang in ["en", "ro"] else INDEX_NAME
        query = user_input.lower().strip()

        hybrid_query = {
            "size": AUTOCOMPLETE_LIMIT,
            "query": {
                "bool": {
                    "should": [
                        {
                            # All tokens must appear somewhere, boost exact name matches
                            "multi_match": {
                                "query": query,
                                "fields": ["name^3", "name._2gram^2", "name._3gram"],
                                "type": "best_fields",
                                "operator": "and",
                                "fuzziness": "AUTO",
                            }
                        },
                        {
                            # Prefix matches for fast autocomplete feel
                            "multi_match": {
                                "query": query,
                                "fields": ["name", "name._2gram", "name._3gram"],
                                "type": "bool_prefix",
                            }
                        },
                    ]
                }
            },
        }

        resp = es.search(index=index_name, body=hybrid_query)
        results = [
            {"id": hit["_source"]["product_id"], "name": hit["_source"]["name"]}
            for hit in resp.get("hits", {}).get("hits", [])
        ]

        # Return top N
        return results[:AUTOCOMPLETE_LIMIT]
