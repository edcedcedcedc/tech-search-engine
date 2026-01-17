# products/management/commands/build_autocomplete.py

from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product
from products.models import AutocompleteToken
from products.utils.utils import tokenize
from products.utils.log.autocomplete_log import autocomplete_log

MAX_CONTEXT = 3  # last N tokens


class Command(BaseCommand):
    help = "Build autocomplete token index from products"

    def handle(self, *args, **kwargs):
        autocomplete_log("Clearing autocomplete tokens...")
        AutocompleteToken.objects.all().delete()

        total = 0

        with transaction.atomic():
            qs = Product.objects.using("default").only(
                "name", "variant", "brand", "category"
            )

            for p in qs.iterator(chunk_size=1000):
                texts = [
                    p.name,
                    p.variant,
                    p.brand,
                    p.category,
                ]

                for text in texts:
                    tokens = tokenize(text)
                    if len(tokens) < 2:
                        continue

                    for i in range(1, len(tokens)):
                        for ctx_len in range(0, MAX_CONTEXT + 1):
                            start = max(0, i - ctx_len)
                            context = " ".join(tokens[start:i])
                            next_token = tokens[i]

                            obj, created = AutocompleteToken.objects.get_or_create(
                                context=context,
                                next_token=next_token,
                                defaults={"count": 1},
                            )
                            if not created:
                                obj.count += 1
                                obj.save(update_fields=["count"])

                            total += 1

        autocomplete_log(f"Autocomplete index built: {total} rows")
