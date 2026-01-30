# api/views/autocomplete.py
from rest_framework.views import APIView
from rest_framework.response import Response
from products.utils.es_index import es, INDEX_NAME

LIMIT = 10
MAX_BACKOFF = 3  # how many tokens back to check

from rest_framework.views import APIView
from rest_framework.response import Response
from products.utils.es_index import es, INDEX_NAME

LIMIT = 10


class AutocompleteAPIView(APIView):
    def get(self, request):
        raw = request.GET.get("q", "")
        lang = request.GET.get("lang", "en")

        if not raw:
            return Response({"suggestions": []})

        tokens = raw.split()
        if raw.endswith(" "):
            context_tokens = tokens
            prefix = ""
        else:
            context_tokens = tokens[:-1]
            prefix = tokens[-1] if tokens else ""

        suggestions = self._lookup(context_tokens, prefix, lang=lang)
        return Response({"suggestions": suggestions})

    def _lookup(self, context_tokens, prefix, lang="en"):
        """
        Use Elasticsearch completion suggester to get multi-word sequences
        that logically follow the typed context.
        """
        index_name = f"{INDEX_NAME}_{lang}" if lang in ["en", "ro"] else INDEX_NAME

        # Build the input string for the suggester
        user_input = " ".join(context_tokens)
        if prefix:
            user_input = f"{user_input} {prefix}".strip()

        body = {
            "suggest": {
                "product-suggest": {
                    "prefix": user_input,
                    "completion": {"field": "suggest", "size": LIMIT},
                }
            }
        }

        res = es.search(index=index_name, body=body)
        options = (
            res.get("suggest", {}).get("product-suggest", [])[0].get("options", [])
        )

        # Return the suggested sequences
        return [opt["text"] for opt in options]
