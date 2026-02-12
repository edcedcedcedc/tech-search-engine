const DB_DEBUG_ENDPOINT = "http://localhost:5179/db-debug";

/**
 * Send IndexedDB debug info to Node logger
 */
export function dbDebugLog(operation: string, details: any) {
  const msg = {
    timestamp: Date.now(),
    operation,
    details,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  fetch(DB_DEBUG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg: JSON.stringify(msg, null, 2) }),
    keepalive: true,
  }).catch((err) => {
    if (
      !navigator.onLine ||
      err?.name === "TypeError"
    ) {
      return;
    }
    if (import.meta.env.DEV) {
      console.warn("dbDebugLog error:", err);
    }
  });
}

// Debug helpers for IndexedDB operations
export const dbDebug = {
  // Log cache hit/miss
  cacheHit: (type: 'products' | 'offers', key: string, source: 'memory' | 'indexeddb' | 'api') => {
    dbDebugLog('CACHE_HIT', { type, key, source, timestamp: Date.now() });
  },

  cacheMiss: (type: 'products' | 'offers', key: string, source: 'memory' | 'indexeddb') => {
    dbDebugLog('CACHE_MISS', { type, key, source, timestamp: Date.now() });
  },

  // Log save operations
  saveProducts: (cacheKey: string, page: number, productCount: number) => {
    dbDebugLog('SAVE_PRODUCTS', { 
      cacheKey, 
      page, 
      productCount,
      timestamp: Date.now() 
    });
  },

  saveOffers: (productId: string, offerCount: number) => {
    dbDebugLog('SAVE_OFFERS', { 
      productId, 
      offerCount,
      timestamp: Date.now() 
    });
  },

        
    dbInitialized: () => {
        dbDebugLog('DB_INITIALIZED', { 
            timestamp: Date.now(),
            dbName: 'pricecomp-db',
            version: 1
        });
    },

    clearProducts: () => {
        dbDebugLog('CLEAR_PRODUCTS', { timestamp: Date.now() });
    },

    clearOffers: () => {
        dbDebugLog('CLEAR_OFFERS', { timestamp: Date.now() });
    },

  // Log cache state
  cacheState: async () => {
    try {
      const { indexedDbService } = await import('../../services/indexedDb');
      await indexedDbService.init();
      const db = (indexedDbService as any).db;
      
      // Products
      const productsTx = db.transaction('products');
      const productsKeys = await productsTx.store.getAllKeys();
      const productsCount = productsKeys.length;
      
      // Offers
      const offersTx = db.transaction('offers');
      const offersKeys = await offersTx.store.getAllKeys();
      const offersCount = offersKeys.length;
      
      dbDebugLog('CACHE_STATE', {
        products: productsCount,
        offers: offersCount,
        productsKeys,
        timestamp: Date.now()
      });
      
      return { productsCount, offersCount, productsKeys, offersKeys };
    } catch (err) {
      dbDebugLog('CACHE_STATE_ERROR', { error: String(err) });
    }
  },

  // Log clear operations
  clearAll: () => {
    dbDebugLog('CACHE_CLEAR_ALL', { timestamp: Date.now() });
  },

  // Log expiry
  cacheExpired: (type: 'products' | 'offers', key: string, age: number) => {
    dbDebugLog('CACHE_EXPIRED', { 
      type, 
      key, 
      ageMs: age,
      ageMinutes: Math.round(age / 60000),
      timestamp: Date.now() 
    });
  },

  // Test function to simulate cache events
  test: () => {
    dbDebug.cacheHit('products', 'test-query-en', 'api');
    dbDebug.cacheMiss('offers', 'test-product-123', 'memory');
    dbDebug.saveProducts('test-query-en', 1, 20);
    dbDebug.saveOffers('test-product-123', 15);
    dbDebug.cacheExpired('products', 'old-query-en', 4 * 60 * 60 * 1000);
    dbDebug.cacheState();
    
    return 'Debug events sent to logger';
  }
};

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).dbDebug = dbDebug;
}