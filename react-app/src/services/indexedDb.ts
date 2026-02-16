import type { DBSchema, IDBPDatabase } from "idb";
import { openDB } from 'idb';
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { dbDebug } from "../webhook/client/dbDebug";
import { INDEXED_DB_CONFIG, isProductCacheValid, isOfferCacheValid } from "../config/indexeddb.config";

interface PriceCompDB extends DBSchema {
  // Product search results
  products: {
    key: string; // cache key (query-lang)
    value: {
      key: string;
      pageCache: Record<number, AggregatedProduct[]>;
      products: AggregatedProduct[];
      totalResults: number;
      updatedAt: number;
    };
    indexes: {
      'updatedAt': number;
    };
  };

  // Product offers
  offers: {
    key: string; // productId
    value: {
      productId: string;
      offers: AggregatedProduct["offers"];
      fetchedAt: number;
    };
    indexes: {
      'fetchedAt': number;
    };
  };
}

class IndexedDbService {
  private db: IDBPDatabase<PriceCompDB> | null = null;
  private readonly DB_NAME = INDEXED_DB_CONFIG.db.name;
  private readonly DB_VERSION = INDEXED_DB_CONFIG.db.version;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<PriceCompDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create products store with indexes
        if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.db.stores.products)) {
          const productsStore = db.createObjectStore("products", { keyPath: "key" });
          productsStore.createIndex('updatedAt', 'updatedAt');
        }

        // Create offers store with indexes
        if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.db.stores.offers)) {
          const offersStore = db.createObjectStore("offers", { keyPath: "productId" });
          offersStore.createIndex('fetchedAt', 'fetchedAt');
        }
      },
    });
    
    // Log initialization using existing debug
    dbDebug.dbInitialized();
  }

  // ============= PRODUCTS =============

  async saveProducts(
    cacheKey: string,
    products: AggregatedProduct[],
    page: number,
    totalResults: number,
    existingPageCache?: Record<number, AggregatedProduct[]>,
  ): Promise<void> {
    await this.ensureDb();

    // Check if we've reached the storage limit
    const currentCount = await this.getProductsCount();
    if (currentCount >= INDEXED_DB_CONFIG.limits.maxProductsEntries) {
      await this.removeOldestProducts();
    }

    const pageCache = {
      ...(existingPageCache ?? {}),
      [page]: products,
    };
    
    await this.db!.put("products", {
      key: cacheKey,
      products,
      pageCache,
      totalResults,
      updatedAt: Date.now(),
    });
    
    // Log save operation using existing debug
    dbDebug.saveProducts(cacheKey, page, products.length);
  }

  async getProducts(cacheKey: string): Promise<{
    pageCache: Record<number, AggregatedProduct[]>;
    totalResults: number;
    updatedAt: number;
  } | null> {
    await this.ensureDb();
    const result = await this.db!.get("products", cacheKey);
    
    if (result) {
      // Check if cache is valid using config TTL
      if (isProductCacheValid(result.updatedAt)) {
        dbDebug.cacheHit('products', cacheKey, 'indexeddb');
        return result;
      } else if (INDEXED_DB_CONFIG.cache.staleWhileRevalidate > 0) {
        // Return stale data but trigger revalidation
        dbDebug.cacheHit('products', cacheKey, 'indexeddb');
        return result;
      } else {
        // Cache expired, log and delete
        const age = Date.now() - result.updatedAt;
        dbDebug.cacheExpired('products', cacheKey, age);
        await this.db!.delete("products", cacheKey);
      }
    }
    
    dbDebug.cacheMiss('products', cacheKey, 'indexeddb');
    return null;
  }

  async clearProducts(): Promise<void> {
    await this.ensureDb();
    await this.db!.clear("products");
    // Using existing debug
    dbDebug.clearProducts();
  }

  // ============= OFFERS =============

  async saveOffers(
    productId: string,
    offers: AggregatedProduct["offers"]
  ): Promise<void> {
    await this.ensureDb();
    
    // Check if we've reached the storage limit
    const currentCount = await this.getOffersCount();
    if (currentCount >= INDEXED_DB_CONFIG.limits.maxOffersEntries) {
      await this.removeOldestOffers();
    }
    
    // Deep clone to avoid reference issues
    const offersToSave = JSON.parse(JSON.stringify(offers));
    
    await this.db!.put("offers", {
      productId,
      offers: offersToSave,
      fetchedAt: Date.now(),
    });
    
    // Using existing debug
    dbDebug.saveOffers(productId, offers.length);
  }

  async getOffers(
    productId: string
  ): Promise<{ offers: AggregatedProduct["offers"]; fetchedAt: number } | null> {
    await this.ensureDb();
    const result = await this.db!.get("offers", productId);
    
    if (result) {
      if (isOfferCacheValid(result.fetchedAt)) {
        dbDebug.cacheHit('offers', productId, 'indexeddb');
      } else {
        // Cache expired
        const age = Date.now() - result.fetchedAt;
        dbDebug.cacheExpired('offers', productId, age);
        
        if (!INDEXED_DB_CONFIG.cache.staleWhileRevalidate) {
          await this.db!.delete("offers", productId);
          dbDebug.cacheMiss('offers', productId, 'indexeddb');
          return null;
        }
        
        // Return stale but usable data
        dbDebug.cacheHit('offers', productId, 'indexeddb');
      }
    } else {
      dbDebug.cacheMiss('offers', productId, 'indexeddb');
    }
    
    return result
      ? { offers: result.offers, fetchedAt: result.fetchedAt }
      : null;
  }

  async clearOffers(): Promise<void> {
    await this.ensureDb();
    await this.db!.clear("offers");
    // Using existing debug
    dbDebug.clearOffers();
  }

  // ============= UTILITY =============

  private async ensureDb(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  async clearAll(): Promise<void> {
    await this.clearProducts();
    await this.clearOffers();
    // Using existing debug
    dbDebug.clearAll();
  }
  
  async getAllProductKeys(): Promise<string[]> {
    await this.ensureDb();
    const tx = this.db!.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    const keys = await store.getAllKeys();
    await tx.done;
    return keys;
  }

  async getAllOfferKeys(): Promise<string[]> {
    await this.ensureDb();
    const tx = this.db!.transaction('offers', 'readonly');
    const store = tx.objectStore('offers');
    const keys = await store.getAllKeys();
    await tx.done;
    return keys;
  }

  // ============= GET COUNTS =============
  async getProductsCount(): Promise<number> {
    await this.ensureDb();
    const tx = this.db!.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    const count = await store.count();
    await tx.done;
    return count;
  }

  async getOffersCount(): Promise<number> {
    await this.ensureDb();
    const tx = this.db!.transaction('offers', 'readonly');
    const store = tx.objectStore('offers');
    const count = await store.count();
    await tx.done;
    return count;
  }

  // ============= CLEANUP METHODS =============
  
  private async removeOldestProducts(): Promise<void> {
    await this.ensureDb();
    const tx = this.db!.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const index = store.index('updatedAt');
    
    // Get oldest entries first
    const oldestEntries = await index.getAll(null, INDEXED_DB_CONFIG.limits.maxProductsEntries / 2);
    
    // Delete the oldest half
    for (const entry of oldestEntries) {
      await store.delete(entry.key);
    }
    
    await tx.done;
  }

  private async removeOldestOffers(): Promise<void> {
    await this.ensureDb();
    const tx = this.db!.transaction('offers', 'readwrite');
    const store = tx.objectStore('offers');
    const index = store.index('fetchedAt');
    
    // Get oldest entries first
    const oldestEntries = await index.getAll(null, INDEXED_DB_CONFIG.limits.maxOffersEntries / 2);
    
    // Delete the oldest half
    for (const entry of oldestEntries) {
      await store.delete(entry.productId);
    }
    
    await tx.done;
  }

  // Optional: Method to manually trigger cache state logging
  async logCacheState(): Promise<void> {
    await this.ensureDb();
    await dbDebug.cacheState();
  }
}

export const indexedDbService = new IndexedDbService();