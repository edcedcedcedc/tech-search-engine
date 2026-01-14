"""from rest_framework.views import APIView
from rest_framework.response import Response
from products.models import AutocompleteToken
from products.utils.autocomplete_text import normalize

LIMIT = 10
MAX_BACKOFF = 3  # how many tokens of context to back off


class AutocompleteAPIView(APIView):
    def get(self, request):
        raw = request.GET.get("q", "").strip()
        if not raw:
            return Response({"suggestions": []})

        normalized = normalize(raw)
        tokens = normalized.split()

        # Determine current word prefix
        if raw.endswith(" "):
            context_tokens = tokens
            prefix = ""  # user finished a word, predict next
        else:
            context_tokens = tokens[:-1]
            prefix = tokens[-1] if tokens else ""  # predict current word

        suggestions = self._lookup(context_tokens, prefix)
        return Response({"suggestions": suggestions})

    def _lookup(self, context_tokens, prefix):

        #Returns a merged list of suggestions based on:
        #1. Current word prefix (letter-based)
        #2. Context-based next word prediction

        suggestions = {}

        # Letter-based suggestion for current word
        if prefix:
            qs = AutocompleteToken.objects.filter(
                next_token__startswith=prefix
            ).order_by("-count")[:LIMIT]
            for (token,) in qs.values_list("next_token"):
                suggestions[token] = suggestions.get(token, 0) + 1

        # Context-based next word prediction
        for drop in range(0, min(len(context_tokens), MAX_BACKOFF) + 1):
            ctx = " ".join(context_tokens[drop:])
            qs = AutocompleteToken.objects.filter(context=ctx).order_by("-count")[
                :LIMIT
            ]
            for (token,) in qs.values_list("next_token"):
                suggestions[token] = suggestions.get(token, 0) + 1

            if suggestions:  # if we found anything, stop backing off
                break

        # Sort suggestions by frequency
        sorted_suggestions = sorted(suggestions.items(), key=lambda x: -x[1])
        return [token for token, _ in sorted_suggestions[:LIMIT]]
"""

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
