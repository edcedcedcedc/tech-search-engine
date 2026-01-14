
          ┌───────────────────────────┐
          │      Product Table        │
          │---------------------------│
          │ id, name, variant, brand  │
          │ category, shop, price     │
          │ embedding (precomputed)   │
          │ canonical_id (prec embedd)│
          └─────────────┬─────────────┘
                        │
                        │
                        ▼
       ┌─────────────────────────────────┐
       │  Layer1: Search API             │
       │  Input: user query             │
       └─────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
┌───────────────────┐       ┌─────────────────────┐
│  Query embedding  │       │ Semantic filter:    │
│ (generated live)  │       │ cosine similarity   │
└───────────────────┘       │ query vs product    │
                            │ embeddings          │
                            └─────────┬───────────┘
                                      │
                                      ▼
                          ┌─────────────────────┐
                          │  Top-N products     │
                          │  semantically       │
                          │  relevant           │
                          └─────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Aggregate by         │
                         │ canonical_id         │
                         │ (prec embedd)        │
                         └─────────┬────────────┘
                                   │
                                   ▼
                     ┌─────────────────────────┐
                     │ Merge lexicographically │
                     │ (live merge of offers)  │
                     │ - match urls            │
                     | - match name, variant   |
                     │ - merge by external_id  │
                     │ - fuzzy match           │
                     └─────────┬──────────────┘
                                   │
                                   ▼
                      ┌────────────────────────┐
                      │ Aggregated product     │
                      │ clusters:              │
                      │ id = canonical_id      │
                      │ offers combined        │
                      │ relevance scored       │
                      └─────────┬─────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  Layer2: Offers API │
                        │  Get offers for     │
                        │  canonical_id       │
                        └─────────────────────┘




Stage 1: Recall (broad, semantic)
Stage 2: Precision (strict, lexical)
![alt text](image.png)
![alt text](image-1.png)