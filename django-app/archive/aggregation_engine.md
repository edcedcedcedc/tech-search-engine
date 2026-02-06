
````markdown
# Aggregation Engine – Documentation

## Overview
The **Aggregation Engine** is a backend system that **fetches products from multiple e-commerce shops**, normalizes and deduplicates them, and stores them in the database using the `Product` model.  
It runs as a **Django management command** (`fetch_products`) and can be scheduled via a bash script for automatic periodic updates.

---

## Product Model

The engine stores product data in the following model:

```python
from django.db import models

class Product(models.Model):
    external_id = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    price = models.IntegerField()
    brand = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    variant = models.CharField(max_length=50, blank=True)
    url = models.URLField()
    image = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    shop = models.CharField(max_length=50, default="")

    # TODO: Availability tracking
    # in_stock = models.BooleanField(default=True)
    # last_seen_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.brand})"

    class Meta:
        unique_together = ("shop", "external_id")
````

**Key points:**

* Each product is uniquely identified by the combination of `shop` and `external_id`.
* Tracks basic information: `name`, `brand`, `category`, `variant`, `price`, `url`, `image`.
* Automatic timestamps: `created_at` and `updated_at`.

---

## Shops & Categories

Currently supported shops and categories:

| Shop   | Categories          |
| ------ | ------------------- |
| Enter  | monitor, laptop, pc |
| Darwin | monitor, laptop, pc |

> New shops or categories can be added by updating the `CATEGORIES` dictionary in the management command.

---

## Management Command: `fetch_products`

### Usage

```bash
python manage.py fetch_products --shop <shop> --category <category> --pages <num_pages>
```

### Arguments

| Argument        | Type   | Description                                       | Default |
| --------------- | ------ | ------------------------------------------------- | ------- |
| `--shop`        | string | Shop to fetch (`enter` or `darwin`)               | None    |
| `--category`    | string | Category to fetch (`monitor`, `laptop`, `pc`)     | None    |
| `--pages`       | int    | Number of pages to fetch                          | 1       |
| `--auto_stdout` | flag   | Disable spinner (useful for cron jobs or logging) | False   |

---

## Fetch Functions

### 1. `fetch_enter_products(category_url, max_pages=1)`

* Fetches products from **Enter**.
* Parses `div.product-item[data-gtm]` for product information.
* Returns a list of dictionaries:

```python
{
    "external_id": "...",
    "name": "...",
    "price": 123,
    "brand": "...",
    "category": "...",
    "variant": "...",
    "url": "...",
    "shop": "Enter",
}
```

### 2. `fetch_darwin_products(category_url, max_pages=1)`

* Fetches products from **Darwin**.
* Parses `a[data-ga4]` for product information.
* Returns a list of dictionaries in the same structure as Enter.

---

## Command Flow

1. **Validate Inputs**

   * Ensure `shop` and `category` exist in the `CATEGORIES` dictionary.

2. **Fetch Products**

   * Call the appropriate fetch function for the shop.
   * Support multiple pages using `max_pages`.

3. **Display / Logging**

   * Interactive mode: shows a spinner while fetching.
   * `--auto_stdout`: disables spinner, logs to stdout (for cron jobs).

4. **Save or Update Products**

   * Each product is saved using `Product.objects.update_or_create()`.
   * Tracks counts for **created** and **updated** products.
   * Logs the action for each product.

5. **Error Handling**

   * Handles network errors, timeouts, parsing issues.
   * Continues processing remaining products.
   * Interactive runs show traceback if an error occurs.

6. **Completion Summary**

   * Displays total **created** and **updated** products.
   * Gracefully exits on keyboard interrupt (`Ctrl+C`).

---

## Bash Scheduler Script

The provided script automates periodic fetching for all shops and categories:

* Configurable parameters:

```bash
PYTHON_PATH="./venv/Scripts/python"
PROJECT_PATH="./"
MAX_PAGES=1
SLEEP_INTERVAL=30  # seconds
LOGFILE="./logs/fetch.log"
```

* Features:

  * Loops over all shops and categories.
  * Logs output to `$LOGFILE`.
  * Handles interrupts (`SIGINT`, `SIGTERM`) gracefully.
  * Sleeps `$SLEEP_INTERVAL` seconds between runs.
  * Calls the management command with `--auto_stdout`.

---

## Notes

* **Normalization:** Extracts `external_id`, `name`, `price`, `brand`, `category`, `variant`, `url`, and `shop`.
* **Deduplication:** Each product is unique by `shop` + `external_id`.
* **Stock / Availability:** Not implemented yet (placeholders exist).
* **Extensibility:** Add new shops or categories by modifying the `CATEGORIES` dictionary.
* **Concurrency:** Spinner runs in a separate thread for better user experience in interactive mode.
* **Logging:** Supports UTF-8 with ASCII fallback for errors.
* **Error Handling:** Errors do not stop the aggregation process; they are logged and skipped.

---

## Example Runs

```bash
# Fetch 2 pages of PC products from Darwin
python manage.py fetch_products --shop darwin --category pc --pages 2

# Fetch all laptop products from Enter with logging only (no spinner)
python manage.py fetch_products --shop enter --category laptop --auto_stdout
```

---

## Summary

The **Aggregation Engine** provides a robust, automated way to:

1. Collect product data from multiple shops.
2. Normalize and deduplicate entries.
3. Keep the database updated for your **Search Engine** layer.

It is designed for **extensibility**, **automation**, and **robustness**, making it a core component of your price aggregator system.
