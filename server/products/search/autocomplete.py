# api/views/autocomplete.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from products.utils.es_index import es, INDEX_NAME

LIMIT = 10
MAX_BACKOFF = 3  # how many tokens back to check


class AutocompleteAPIView(APIView):
    def get(self, request):
        raw = request.GET.get("q", "")
        if not raw:
            return Response({"suggestions": []})

        tokens = raw.split()
        if raw.endswith(" "):
            context_tokens = tokens
            prefix = ""
        else:
            context_tokens = tokens[:-1]
            prefix = tokens[-1] if tokens else ""

        suggestions = self._lookup(context_tokens, prefix)
        return Response({"suggestions": suggestions})

    def _lookup(self, context_tokens, prefix):
        results = {}
        for drop in range(0, min(len(context_tokens), MAX_BACKOFF) + 1):
            context = " ".join(context_tokens[drop:])

            query = {
                "size": LIMIT,
                "query": {
                    "bool": {
                        "must": [
                            (
                                {"match": {"context": context}}
                                if context
                                else {"match_all": {}}
                            ),
                            (
                                {"prefix": {"next_token": prefix}}
                                if prefix
                                else {"match_all": {}}
                            ),
                        ]
                    }
                },
                "sort": [{"count": {"order": "desc"}}],
            }

            res = es.search(index=INDEX_NAME, body=query)
            for hit in res["hits"]["hits"]:
                token = hit["_source"]["next_token"]
                results[token] = results.get(token, 0) + hit["_source"]["count"]

            if results:
                break  # stop backing off if we found results

        # sort by frequency
        sorted_suggestions = sorted(results.items(), key=lambda x: -x[1])
        return [token for token, _ in sorted_suggestions[:LIMIT]]
