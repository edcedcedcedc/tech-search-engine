#### Fetch step
Save all products as-is from the shop DB.
Keep shop and raw_category untouched.

#### Category mapping / normalization step
Read from the raw fetched products, apply CategoryMapping → save unified_category field or replace category in a new field.
This is exactly what your mapping command is doing.

#### Translation step
Read unified objects and update translations for names / variants.

#### Merge step
Move the fully processed, normalized, translated data into production DB.













# 1. CRAWLER (your current code) - runs periodically
#    Scrapes: Darwin, Enter, XStore
#    Stores: shop_darwin.sqlite3, shop_enter.sqlite3, shop_xstore.sqlite3

# 2. USER SEARCH - happens in real-time
#    Query: "27 inch gaming monitor"
#    Search: 
#      - Check darwin db for monitors
#      - Check enter db for monitors  
#      - Check xstore db for monitors
#      - Use embeddings to find "gaming" monitors
#      - Use fuzzy matching for "27 inch"

# 3. AGGREGATION (at search time):
#    - Combine results from all 3 databases
#    - Remove duplicates (fuzzy matching)
#    - Sort by price/relevance
#    - Return to user