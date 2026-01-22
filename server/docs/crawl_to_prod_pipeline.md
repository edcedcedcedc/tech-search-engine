

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
| --------------- | ----------------------- | ------------------------------------------------ |
| Active          | `Product`               | current, live product; mutable; can be updated   |
| Archived        | `ArchivedProduct`       | snapshot of an inactive product; immutable       |
| Broken Archived | `ArchivedBrokenProduct` | snapshot of invalid or broken product; immutable |
| Deleted         | `None` (row removed)    | historical price data survives                   |

A product cannot be simultaneously in multiple of these states, except price history references (which are relinked).



