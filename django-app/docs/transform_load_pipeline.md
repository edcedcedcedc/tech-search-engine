

# ARCHITECTURE OVERVIEW

This system is a state-based product ingestion and lifecycle pipeline designed for crawling, normalization, and long-term analytics. It explicitly separates:

* current state (`Product`)
* past / inactive states (`ArchivedProduct`, `ArchivedBrokenProduct`)
* time-series data (`ProductPriceHistory`)
* ingestion control (`DatabaseManager`, `ChangeTracker`)
* downstream analytics (`ProductAnalytics`)

The goal is to preserve **history and meaning**, not just rows.

# DATA FLOW (HIGH LEVEL)

1. Crawler fetches raw product data → `fetched_item` dict
2. `DatabaseManager.save_or_update_product()` decides what to do
3. Product is:

   * created
   * updated
   * archived
   * archived as broken
   * or restored
4. Model methods (`archive`, `archive_broken`, batch ops) handle
   **state transitions**
5. Price history is written ONLY at **state boundaries**
   (archive / broken / downstream processor)
6. Analytics and long-term stats operate on immutable history

# CORE MODELS & RESPONSIBILITIES

## Product

Represents the **current, active state** of a product.

* One row per `(shop, external_id)`
* Mutable
* Can be updated frequently
* Has NO responsibility for analytics
* May be archived but is not deleted during normal operation

Important fields:

* `price`, `in_stock` → current truth
* `dirty` → signals downstream processing required
* `t_*` fields → localization only

Key idea:
Product = "what the shop looks like RIGHT NOW"

## ArchivedProduct

Represents a **historical snapshot** of a product that is no longer active.

Used when:

* product goes out of stock
* product disappears from crawl
* manual archive operations

Properties:

* Immutable snapshot
* Same identity (`external_id`, `canonical_id`)
* Separate table to prevent accidental resurrection
* Used for analytics and audits

Key idea:
ArchivedProduct = "this product existed, but no longer does"

## ArchivedBrokenProduct

Specialized archive for invalid products (e.g says price = 0).

Used when:

* crawler detects invalid state
* product data is broken upstream

Properties:

* Treated as terminal until restored
* Always `in_stock = False`
* Preserves identity and last known metadata

Key idea:
Broken archive = "this product is invalid and must not reappear silently"

## ProductPriceHistory

Time-series store for price and stock changes.

Critical design rules:

* NEVER deleted
* NEVER mutated (except relinking)
* Survives Product deletion
* Relinked on archive / restore

Relationships:

* Points to either `Product` OR `ArchivedProduct`
* Never both at the same time

Important:
Price history is NOT written on every update by default.
It is written:

* on archive
* on archive_broken
* by downstream processors

Key idea:
PriceHistory = "what happened over time, regardless of state"

## ChangeTracker

Pure comparison utility.

Responsibilities:

* Detect meaningful field-level changes
* No database writes
* No business logic
* No side effects

Tracks:

* price
* name
* variant
* in_stock

Returns:

* changed fields
* old values
* new values

Key idea:
ChangeTracker answers: "Did something important change?"

## DatabaseManager

The ingestion orchestrator.

Responsibilities:

* Load context (active / archived / broken)
* Decide product lifecycle transitions
* Apply ChangeTracker
* Mark products as dirty
* Call model methods for state transitions

Does NOT:

* Write price history directly (anymore)
* Compute analytics
* Handle embeddings
* Do batch operations

Key idea:
DatabaseManager = deterministic state machine

# DATABASE STRATEGY

* Multiple crawler DBs (`shop`-scoped) are used for ingestion
* Default DB is the **long-term historical and analytics store**
* `using()` is stated explicitly only where cross-DB correctness matters
* Price history is intentionally written to the default DB only

This avoids:

* duplicated history
* cross-db foreign key chaos
* accidental loss of analytics data

# STATE TRANSITIONS (SUMMARY)

Active → Archived

* via `Product.archive()`
* price history is linked to archive

Active → Broken

* via `Product.archive_broken()`
* price history records terminal state

Archived → Active

* via restore logic
* history relinked back to Product

Deleted Product

* history survives (`SET_NULL`)

# WHY THIS DESIGN

* Prevents data loss
* Preserves analytics forever
* Makes crawler failures recoverable
* Allows deterministic replay
* Scales across shops and DBs
* Keeps ingestion logic simple and auditable

This is NOT CRUD.
This is a state machine with memory.


# STATES

| State           | Model / Table           | Characteristics                                  |
| --------------- | ---------------------- | ------------------------------------------------ |
| Active          | `Product`               | current, live product; mutable; can be updated  |
| Archived        | `ArchivedProduct`       | snapshot of an inactive product; immutable      |
| Broken Archived | `ArchivedBrokenProduct` | snapshot of invalid or broken product; immutable|
| Deleted         | `None` (row removed)    | historical price data survives                  |

# STATE MACHINE

| Condition         | First Crawl (seen = 1) | Subsequent Crawls (seen > 1)                                           | Notes                                                    |
| ----------------- | ---------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| price == 0        | BROKEN                 | BROKEN                                                                 | Always wins; overrides in_stock                          |
| in_stock == false | ARCHIVED               | If not archived → ACTIVE; If already archived → do nothing             | Fresh OOS items can appear in active if not yet archived |
| in_stock == true  | ACTIVE                 | ACTIVE; If previously archived → restore to active                     | In-stock items must always be active                     |



# COMBINATIONS OF STATE
| Price | In Stock | Seen Count | Active Exists | Archived Exists | Broken Exists | Resulting Method / Action | Notes                                       |
| ----- | -------- | ---------- | ------------- | --------------- | ------------- | ------------------------- | ------------------------------------------- |
| 0     | True     | 1          | No            | No              | No            | `_handle_broken`          | Always wins, becomes broken                 |
| 0     | True     | 1          | Yes           | No              | No            | `_handle_broken`          | Active archived as broken                   |
| 0     | False    | 1          | No            | No              | No            | `_handle_broken`          | Broken overrides OOS                        |
| 0     | False    | 2          | Yes           | Yes             | No            | `_handle_broken`          | Broken overrides everything                 |
| >0    | True     | 1          | No            | No              | No            | `_create_new`             | First crawl, create ACTIVE                  |
| >0    | True     | 1          | Yes           | No              | No            | `_update_active`          | First crawl, update existing ACTIVE         |
| >0    | True     | 2          | No            | Yes             | No            | `_restore_from_archive`   | Restore previously archived → ACTIVE        |
| >0    | True     | 2          | Yes           | No              | No            | `_update_active`          | Update existing ACTIVE                      |
| >0    | True     | 2          | No            | No              | No            | `_create_new`             | Create new ACTIVE (rare, edge case)         |
| >0    | False    | 1          | No            | No              | No            | `_archive_oos`            | First crawl OOS → ARCHIVED                  |
| >0    | False    | 1          | Yes           | No              | No            | `_archive_oos`            | Active archived OOS                         |
| >0    | False    | 2          | No            | Yes             | No            | `None / do nothing`       | Already archived → nothing                  |
| >0    | False    | 2          | Yes           | No              | No            | `_update_active`          | Active exists, not archived → update ACTIVE |
| >0    | False    | 2          | No            | No              | No            | `_create_new`             | Fresh OOS not in DB yet → create ACTIVE     |






# MERGE LOGIC

Active / Stage DB → contains everything the crawler currently sees (including restored products).
Production DB → only gets updates from Stage via the merge.
If a product no longer exists in Stage, it simply isn’t touched in Production.
If a product is restored/new in Stage, it fully merges into Production.
If a product exists in Production, only the allowed fields are updated.
So you never “delete” Production stuff accidentally, unless you explicitly build logic for that.

New → full create
Existing → only safe fields update
Missing → untouched

`_update_active` `_maybe_restore`
| Name Changed | Variant Changed | Preserved Translations Non-Empty? | Resulting Action                                            | Notes                                                                           |
| ------------ | --------------- | --------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| No           | No              | Yes                               | Preserve translations, keep embeddings                      | Only price/stock/other fields changed → save normally (`UPDATE_DB` if enriched) |
| No           | No              | No                                | Clear embeddings, preserve translations as `{}`             | Price/stock updated, but translations empty → embeddings cleared                |
| Yes          | No              | Irrelevant                        | Clear `t_name`, `t_variant`, `t_category`, clear embeddings | Name changed → translations reset, embeddings wiped, save to shop DB            |
| No           | Yes             | Irrelevant                        | Clear `t_name`, `t_variant`, `t_category`, clear embeddings | Variant changed → translations reset, embeddings wiped, save to shop DB         |
| Yes          | Yes             | Irrelevant                        | Clear `t_name`, `t_variant`, `t_category`, clear embeddings | Both changed → translations reset, embeddings wiped, save to shop DB            |
