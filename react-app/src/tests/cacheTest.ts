import { indexedDbService } from "../services/indexedDb";
import { useStore } from "../store/store";
import { dbDebugLog} from "../webhook/client/dbDebug";

export const testCache = {
  // Clear everything
  clearAll: async () => {
    dbDebugLog("TEST_CLEAR_ALL", { action: "clear_all_caches" });
    await indexedDbService.clearAll();
    sessionStorage.clear();
    localStorage.clear();
  },

  // Inspect current cache state
  inspect: async () => {
    // Check IndexedDB
    await indexedDbService.init();
    const db = (indexedDbService as any).db;
    
    // Products
    const productsTx = db.transaction('products');
    const productsKeys = await productsTx.store.getAllKeys();
    
    const productDetails = [];
    for (const key of productsKeys) {
      const data = await indexedDbService.getProducts(key);
      const pageCount = Object.keys(data?.pageCache || {}).length;
      productDetails.push({
        key,
        pageCount,
        updatedAt: data?.updatedAt
      });
    }
    
    // Offers
    const offersTx = db.transaction('offers');
    const offersKeys = await offersTx.store.getAllKeys();
    
    // Zustand memory
    const state = useStore.getState();
    
    dbDebugLog("TEST_INSPECT", {
      indexedDb: {
        products: {
          count: productsKeys.length,
          queries: productDetails.slice(0, 5) // first 5 only
        },
        offers: {
          count: offersKeys.length,
          productIds: offersKeys.slice(0, 5)
        }
      },
      zustand: {
        queries: Object.keys(state.multiQueryCache).length,
        offers: Object.keys(state.productOffers).length,
        queryCacheKey: state.queryCacheKey
      }
    });
    
    return {
      indexedDb: { products: productsKeys.length, offers: offersKeys.length },
      zustand: { queries: Object.keys(state.multiQueryCache).length, offers: Object.keys(state.productOffers).length }
    };
  },

    // Modify testSearch to return duration
    testSearch: async (query: string = "laptop") => {
    dbDebugLog("TEST_SEARCH_START", { query });
    
    const start = performance.now();
    await useStore.getState().searchProducts(query, "en", 1);
    const duration = performance.now() - start;
    
    await new Promise(r => setTimeout(r, 500));
    
    dbDebugLog("TEST_SEARCH_COMPLETE", {
        query,
        durationMs: Math.round(duration),
        timestamp: Date.now()
    });
    
    await testCache.inspect();
    
    return { durationMs: Math.round(duration) }; // <-- RETURN
    },

  // Test offers flow
  testOffers: async (productId: string) => {
    dbDebugLog("TEST_OFFERS_START", { productId });
    
    const start = performance.now();
    await useStore.getState().openProduct(productId);
    const duration = performance.now() - start;
    
    // Wait for async cache write
    await new Promise(r => setTimeout(r, 500));
    
    dbDebugLog("TEST_OFFERS_COMPLETE", {
      productId,
      durationMs: Math.round(duration),
      timestamp: Date.now()
    });
    
    await testCache.inspect();
  },

  // Modify testCacheHit to return duration
    testCacheHit: async (query: string = "laptop") => {
    const start = performance.now();
    await useStore.getState().searchProducts(query, "en", 1);
    const duration = performance.now() - start;
    
    dbDebugLog("TEST_CACHE_HIT", {
        query,
        durationMs: Math.round(duration),
        source: "indexeddb",
        timestamp: Date.now()
    });
    
    return { durationMs: Math.round(duration) }; // <-- RETURN
    },

  // Test cache expiry
  testExpiry: async (query: string = "laptop") => {
    dbDebugLog("TEST_EXPIRY_START", { query });
    
    // First ensure it's cached
    await useStore.getState().searchProducts(query, "en", 1);
    
    // Manually modify timestamp to simulate expiry
    const cacheKey = `${query}-en`;
    const cached = useStore.getState().multiQueryCache[cacheKey];
    
    if (cached) {
      const oldTimestamp = Date.now() - (4 * 60 * 60 * 1000); // 4 hours ago
      useStore.setState((s) => ({
        multiQueryCache: {
          ...s.multiQueryCache,
          [cacheKey]: {
            ...cached,
            updatedAt: oldTimestamp
          }
        }
      }));
      
      dbDebugLog("TEST_EXPIRY_SIMULATED", {
        cacheKey,
        oldTimestamp,
        ageHours: 4
      });
    }
    
    // This should miss cache and hit API
    await testCache.testSearch(query);
    
    dbDebugLog("TEST_EXPIRY_COMPLETE", { query });
  },


    // Add this new method to your testCache object
    resetEverything: async () => {
    dbDebugLog("TEST_RESET_START", { timestamp: Date.now() });
    
    console.log('🧹 Starting fresh reset...');
    
    // 1. Clear IndexedDB
    await indexedDbService.clearAll();
    console.log('✅ IndexedDB cleared');
    
    // 2. Clear Zustand memory cache
    useStore.getState().clearCache();
    console.log('✅ Zustand memory cache cleared');
    
    // 3. Clear sessionStorage (persisted Zustand)
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // 4. Clear localStorage (theme, cookies, etc)
    localStorage.clear();
    console.log('✅ localStorage cleared');
    
    // 5. Reset session expired state if any
    useStore.getState().closeSessionExpired();
    
    // 6. Clear selected product
    useStore.getState().closeProduct();
    
    // 7. Clear selected offers
    useStore.getState().clearSelectedOffers();
    
    // 8. Reset query
    useStore.getState().setQuery('');
    
    // 9. Trigger autocomplete reset
    useStore.getState().triggerAutocompleteReset();
    
    // 10. Verify everything is empty
    await indexedDbService.init();
    const db = (indexedDbService as any).db;
    
    const productsTx = db.transaction('products');
    const productsKeys = await productsTx.store.getAllKeys();
    
    const offersTx = db.transaction('offers');
    const offersKeys = await offersTx.store.getAllKeys();
    
    const state = useStore.getState();
    
    console.log('\n📊 FINAL STATE:');
    console.log(`   IndexedDB Products: ${productsKeys.length}`);
    console.log(`   IndexedDB Offers: ${offersKeys.length}`);
    console.log(`   Zustand Queries: ${Object.keys(state.multiQueryCache).length}`);
    console.log(`   Zustand Offers: ${Object.keys(state.productOffers).length}`);
    console.log(`   sessionStorage: ${sessionStorage.length} items`);
    console.log(`   localStorage: ${localStorage.length} items`);
    
    dbDebugLog("TEST_RESET_COMPLETE", {
        indexedDb: { products: productsKeys.length, offers: offersKeys.length },
        zustand: { 
        queries: Object.keys(state.multiQueryCache).length, 
        offers: Object.keys(state.productOffers).length 
        },
        sessionStorage: sessionStorage.length,
        localStorage: localStorage.length,
        timestamp: Date.now()
    });
    
    console.log('\n✨ All caches reset! Ready for fresh start.');
    
    return {
        indexedDb: { products: productsKeys.length, offers: offersKeys.length },
        zustand: { queries: Object.keys(state.multiQueryCache).length, offers: Object.keys(state.productOffers).length }
    };
    },

  // Full test cycle
  runFullTest: async () => {
    dbDebugLog("TEST_FULL_START", { timestamp: Date.now() });
    
    await testCache.clearAll();
    await testCache.inspect();
    
    dbDebugLog("TEST_STEP", { step: 1, description: "Search for 'laptop'" });
    await testCache.testSearch("laptop");
    
    dbDebugLog("TEST_STEP", { step: 2, description: "Wait 2 seconds" });
    await new Promise(r => setTimeout(r, 2000));
    
    dbDebugLog("TEST_STEP", { step: 3, description: "Search again (should hit cache)" });
    await testCache.testCacheHit("laptop");
    
    dbDebugLog("TEST_STEP", { step: 4, description: "Test cache expiry" });
    await testCache.testExpiry("laptop");
    
    dbDebugLog("TEST_FULL_COMPLETE", { timestamp: Date.now() });
    await testCache.inspect();
  },

  // Get first product ID from current search results
  getFirstProductId: () => {
    const state = useStore.getState();
    const firstProduct = state.aggregatedProducts[0];
    if (firstProduct) {
      dbDebugLog("TEST_GET_FIRST_PRODUCT", { 
        productId: firstProduct.id,
        productName: firstProduct.name 
      });
      return firstProduct.id;
    }
    dbDebugLog("TEST_GET_FIRST_PRODUCT", { error: "No products found" });
    return null;
  }
};

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).testCache = testCache;
  dbDebugLog("TEST_HELPER_LOADED", { timestamp: Date.now() });
}