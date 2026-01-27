"""paste to shell"""

from products.models import Product
from products.utils.generate_canonical_id import generate_canonical_id

# Fetch a few products
products = Product.objects.all()[:5]

for p in products:
    # Print existing canonical_id
    print("Existing canonical_id:", p.canonical_id)

    # Generate canonical_id on the fly (for verification)
    generated = generate_canonical_id(p.name or "", p.variant or "", p.brand or "")
    print("Generated canonical_id:", generated)

    # Compare
    print("Match?", generated == p.canonical_id)
    print("-" * 50)
