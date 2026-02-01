# api/views/autocomplete.py
from rest_framework.views import APIView
from rest_framework.response import Response
from products.utils.es_index import es, INDEX_NAME


MAX_BACKOFF = 3  # how many tokens back to check
LIMIT = 15


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
        Use Elasticsearch search_as_you_type field for autocomplete.
        """
        index_name = f"{INDEX_NAME}_{lang}" if lang in ["en", "ro"] else INDEX_NAME
        query = user_input.lower().strip()

        body = {
            "size": LIMIT,
            "query": {
                "multi_match": {
                    "query": query,
                    "type": "bool_prefix",
                    "fields": ["name", "name._2gram", "name._3gram"],
                }
            },
        }

        res = es.search(index=index_name, body=body)
        hits = res.get("hits", {}).get("hits", [])

        # Return product_id + name
        suggestions = [
            {"id": hit["_source"]["product_id"], "name": hit["_source"]["name"]}
            for hit in hits
        ]
        return suggestions
