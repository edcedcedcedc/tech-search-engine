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