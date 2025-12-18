# Moldova Tech Price Aggregator

## 1. Idea

Build a **centralized price-comparison platform** that aggregates tech products from major Moldovan online stores (e.g. Darwin.md, Enter.online, Xstore.md, 999.md tech listings) and displays them in **one unified interface**, allowing users to easily compare prices, availability, and sellers.

The platform **does not sell products** — it redirects users to the original stores.

---

## 2. Goal

### Primary Goal

Reduce friction for consumers when searching for tech products by:

* Eliminating the need to visit multiple websites
* Making price comparison instant and transparent

### Secondary Goals

* Increase price transparency in the local market
* Create a foundation for premium comparison and tracking features
* Become the **default starting point** for tech purchases in Moldova

---

## 3. Target Users

* Tech buyers in Moldova (phones, laptops, accessories)
* Price-sensitive users
* Power users who track deals and discounts

---

## 4. MVP Scope

**MVP = price comparison for a limited set of categories and stores**

### MVP Constraints

* 2–3 stores only
* 1–2 categories (e.g. smartphones, laptops)
* Read-only aggregation (no accounts required)

---

## 5. Tech Stack

### Backend

* Python + FastAPI
* Async scraping / fetching
* REST API for frontend
* Background jobs (cron / scheduler)

### Data Collection

* Hybrid approach

  * Official APIs if available
  * Web scraping (requests + BeautifulSoup / Playwright)
* Rate-limited, cached, source-respecting

### Database

* PostgreSQL

  * Products
  * Offers / Prices
  * Sources
  * (Optional) Price history

### Frontend

* React (Vite)
* Server-side rendering for SEO (maybe)
* Responsive UI (desktop-first MVP)

### Infrastructure

* Docker
* VPS (Hetzner / DigitalOcean)
* Nginx
* GitHub Actions (basic CI)

---

## 6. Core Data Model (Unified Schema)

```json
Product {
  id
  name
  brand
  category
  image_url
}

Offer {
  product_id
  store_name
  price
  currency
  availability
  product_url
  last_updated
}
```

This structure allows **multiple offers per product**, enabling direct comparison across stores.

---

## 7. MVP Modules

### 1. Source Connectors

* One module per store
* Responsibilities:

  * Fetch product listings
  * Parse name, price, availability
  * Normalize data

### 2. Normalization & Matching

* Clean and standardize product names
* Match identical products across stores
* Heuristics:

  * Brand + model
  * SKU (if available)

### 3. Aggregation Engine

* Combine offers from all sources
* Store normalized data in DB
* Periodic refresh

### 4. API Layer

* `/products`
* `/products/{id}`
* `/offers`
* `/search`

### 5. Frontend UI

* Product listing page
* Product comparison page
* Filters and sorting

---

## 8. MVP Features (Board-Level)

### Must-Have

* Unified product catalog
* Multiple store prices per product
* Sort by lowest price
* Filters:

  * Store
  * Price range
  * Brand
* Redirect to original store

### Nice-to-Have (Post-MVP)

* Price history charts
* Stock alerts
* Favorites

---

## 9. Monetization Strategy

### Initial Monetization

**Buy Me a Coffee integration (via webhooks)**

* Support the project button
* Webhook triggers:

  * Store supporter events
  * Unlock supporter-only perks

### Supporter Perks

* Ad-free UI
* Price history access
* Faster refresh rate
* Early access to new features

Core comparison functionality remains **free**.

---

## 10. Legal & Ethical Positioning

* Use only publicly available product data
* No personal data collection
* Clear attribution to source stores
* Respect robots.txt and crawl limits

---

## 11. Expansion Roadmap

### Phase 2

* Add more stores
* Add more categories
* Price alerts

### Phase 3

* Mobile-first UI
* Browser extension
* Optional affiliate partnerships

---

## 12. One-Sentence Pitch

> A single place to compare all tech prices in Moldova — fast, transparent, and unbiased.
