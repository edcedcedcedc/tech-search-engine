

````markdown
# Search Engine – Documentation

## Overview
1. **Layer 1: Search / Probabilistic Clusters**
2. **Layer 2: Offers (Preview / Full)**

---

## Layer 1: `SearchAPIView`

### Purpose
- Accepts a query string (`q`) and returns **aggregated product clusters** (probabilistic clusters).
- Each cluster represents multiple products (from different shops or variants) combined.
- Supports **pagination** via cursor.

### Class-level Cache
- `aggregated_cache`: Stores aggregated clusters.
- Layer 2 (`ProductOffersAPIView`) depends on this cache. If it’s empty, no offers can be returned.

### Flow
1. **Tokenize Query**
   ```python
   query.lower().split()
````

Splits query into tokens for filtering.

2. **Filter Products**

   * Filters `Product` objects containing any of the query tokens in the name.

3. **Aggregate Products**

   * Groups products by `external_id`.
   * Builds an aggregated product dictionary containing:

     * `id`, `name`, `brand`, `category`, `variant`
     * `offers`: list of all offers
     * `lowest_price`
     * `image`

4. **Identity Resolution**

   * Uses fuzzy string matching to merge similar products (same name + variant).
   * Combines offers and recalculates `lowest_price`.

5. **Relevance Scoring**

   * Combines three metrics:

     * Fuzzy match score (`fuzz.token_set_ratio`) → 60%
     * Token coverage → 30%
     * Brand match → 10%
   * Result stored in `relevance`.

6. **Sorting & Pagination**

   * Sorted by `relevance`, `lowest_price`, `id`.
   * Pagination via cursor: `"id_lowestprice"`.

7. **Response**

```json
{
    "products": [
        {
            "id": "...",
            "name": "...",
            "brand": "...",
            "category": "...",
            "variant": "...",
            "lowest_price": 123,
            "offers": 5,   // lightweight preview
            "relevance": 0.87,
            "image": "..."
        }
    ],
    "next_cursor": "..."
}
```

---

## Layer 2: `ProductOffersAPIView`

### Purpose

* Returns **offers for a specific product cluster** (from Layer 1 cache).
* Can return **lightweight preview** (shop + price) or **full details**.

### Dependencies

* Relies on `SearchAPIView.aggregated_cache`.
* If cache is empty → returns empty offers.

### Flow

1. Get product cluster from `aggregated_cache` by `product_id`.
2. Sort offers by price.
3. Apply pagination via cursor: `"price_shop"`.
4. Return:

   * `offers`: limited by `limit` and `full` flag.
   * `has_more`: boolean.
   * `next_cursor`: string for next page.

### Response

```json
{
    "offers": [
        {
            "shop": "...",
            "name": "...",
            "price": 123
        }
    ],
    "has_more": true,
    "next_cursor": "..."
}
```

---

## Notes

* **Aggregation**: Layer 1 combines multiple Product objects into a single cluster to avoid duplicates.
* **Caching**: Only Layer 1 stores a class-level cache; Layer 2 depends on it.
* **Pagination**: Both layers support cursor-based pagination.
* **Relevance**: Calculated based on fuzzy matching + token coverage + brand.
* **Fuzzy Matching Threshold**: `FUZZY_THRESHOLD = 85`.

---

This structure ensures:

* Search engine handles both **deduplication** and **relevance scoring**.
* Offers cannot be fetched independently of a search result.
* Layered architecture allows future scraping protection via cookies/captcha without breaking the API.


