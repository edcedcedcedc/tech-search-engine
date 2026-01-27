1. **Multithreaded Fetching:**

   * Each shop/category combination runs in its own **worker thread**.
   * Threads fetch items independently and place **batches into a thread-safe queue**.

2. **Batch Processing:**

   * Items are collected into batches (default 500 items).
   * Remaining items at the end of fetching are also processed.

3. **Queue System:**

   * All threads push batches into a shared `Queue`.
   * The main thread consumes batches sequentially, saving to the DB safely.

4. **Database Management:**

   * Uses `DatabaseManager` to **create new products or update existing ones**.
   * Supports **tracking changes** for specific fields (price, name, variant, in_stock).
   * Updates only if changes are detected to minimize unnecessary writes.

5. **Configuration:**

   * Shops and categories are defined in a `config` dictionary.
   * Each shop has a fetching function and category URLs.
   * Filters can be applied using `--shop` or `--category`.

6. **Logging & Rate Limiting:**

   * Logs each batch, saved/updated/changed counts.
   * Handles rate limits and random pauses between batches (`random_sleep`).

7. **Command-line Usage:**

   * Example:

     ```bash
     python manage.py shop_crawler_engine --shop enter --category laptop --pages 3
     ```
   * Optional: `--track-fields` to define which fields to track for changes.

**Flow Summary:**

```
Worker threads per shop/category
            │
            ▼
        Fetch items
            │
            ▼
       Place batch in queue
            │
            ▼
    Main thread consumes batch
            │
            ▼
      Process batch → save/update DB
            │
            ▼
         Log results
```

**Benefits:**

* Parallel fetching for speed.
* Safe DB writes via single-threaded batch processing.
* Flexible: supports multiple shops, categories, pages, and track fields.

