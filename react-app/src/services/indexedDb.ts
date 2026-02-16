import type { DBSchema, IDBPDatabase } from "idb";
import { openDB } from 'idb';
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { dbDebug } from "../webhook/client/dbDebug"; // <-- ADD THIS

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
  };

  // Product offers
  offers: {
    key: string; // productId
    value: {
      productId: string;
      offers: AggregatedProduct["offers"];
      fetchedAt: number;
    };
  };
}

class IndexedDbService {
  private db: IDBPDatabase<PriceCompDB> | null = null;
  private readonly DB_NAME = "pricecomp-db";
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<PriceCompDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create products store
        if (!db.objectStoreNames.contains("products")) {
          db.createObjectStore("products", { keyPath: "key" });
        }

        // Create offers store
        if (!db.objectStoreNames.contains("offers")) {
          db.createObjectStore("offers", { keyPath: "productId" });
        }
      },
    });
    
    // Log initialization
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
    
    // Log save operation
    dbDebug.saveProducts(cacheKey, page, products.length);
  }

  async getProducts(cacheKey: string): Promise<{
    pageCache: Record<number, AggregatedProduct[]>;
    totalResults: number;
    updatedAt: number;
  } | null> {
    await this.ensureDb();
    const result = await this.db!.get("products", cacheKey);
    
    // Log cache hit/miss
    if (result) {
      dbDebug.cacheHit('products', cacheKey, 'indexeddb');
    } else {
      dbDebug.cacheMiss('products', cacheKey, 'indexeddb');
    }
    
    return result || null;
  }

  async clearProducts(): Promise<void> {
    await this.ensureDb();
    await this.db!.clear("products");
    dbDebug.clearProducts(); // <-- ADD THIS
  }

  // ============= OFFERS =============

  async saveOffers(
    productId: string,
    offers: AggregatedProduct["offers"]
  ): Promise<void> {
    await this.ensureDb();
    
  
   
    // Deep clone to avoid reference issues
    const offersToSave = JSON.parse(JSON.stringify(offers));
    
    await this.db!.put("offers", {
      productId,
      offers: offersToSave,
      fetchedAt: Date.now(),
    });
    
    dbDebug.saveOffers(productId, offers.length);
  }


    // Update getOffers to verify data integrity
    async getOffers(
      productId: string
    ): Promise<{ offers: AggregatedProduct["offers"]; fetchedAt: number } | null> {
      await this.ensureDb();
      const result = await this.db!.get("offers", productId);
      
      if (result) { 
        dbDebug.cacheHit('offers', productId, 'indexeddb');
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
    dbDebug.clearOffers(); // <-- ADD THIS
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
    dbDebug.clearAll(); // <-- ADD THIS
  }
    //needed for updates
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

}

export const indexedDbService = new IndexedDbService();