// webhook/client/syncDebug.ts
const SYNC_DEBUG_ENDPOINT = "http://localhost:5179/sync-debug";

/**
 * Send sync debug info to Node logger
 */
export function syncDebugLog(operation: string, details: any, error?: any) {
  const msg = {
    timestamp: Date.now(),
    operation,
    details,
    error: error ? {
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined
    } : undefined,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  fetch(SYNC_DEBUG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg: JSON.stringify(msg, null, 2) }),
    keepalive: true,
  }).catch((err) => {
    if (!navigator.onLine || err?.name === "TypeError") {
      return;
    }
    if (import.meta.env.DEV) {
      console.warn("syncDebugLog error:", err);
    }
  });
}

export const syncDebug = {
  // Sync lifecycle
  syncStarted: (totalQueries: number) => {
    syncDebugLog('SYNC_STARTED', { 
      totalQueries,
      timestamp: Date.now()
    });
  },

  syncCompleted: (totalQueries: number, totalProducts: number, totalOffers: number) => {
    syncDebugLog('SYNC_COMPLETED', { 
      totalQueries,
      totalProducts,
      totalOffers,
      duration: Date.now()
    });
  },

  syncFailed: (error: any, currentQuery?: string) => {
    syncDebugLog('SYNC_FAILED', { 
      currentQuery,
      timestamp: Date.now()
    }, error);
  },

  syncCancelled: (queriesCompleted: number) => {
    syncDebugLog('SYNC_CANCELLED', { 
      queriesCompleted,
      timestamp: Date.now()
    });
  },

  // Query level
  queryStarted: (query: string, lang: string, pageCount: number) => {
    syncDebugLog('QUERY_STARTED', { 
      query,
      lang,
      pageCount,
      timestamp: Date.now()
    });
  },

  queryCompleted: (query: string, productsCount: number, pages: number[]) => {
    syncDebugLog('QUERY_COMPLETED', { 
      query,
      productsCount,
      pages,
      timestamp: Date.now()
    });
  },

  queryFailed: (query: string, error: any) => {
    syncDebugLog('QUERY_FAILED', { 
      query,
      timestamp: Date.now()
    }, error);
  },

  // Page level
  pageFetched: (query: string, page: number, productCount: number) => {
    syncDebugLog('PAGE_FETCHED', { 
      query,
      page,
      productCount,
      timestamp: Date.now()
    });
  },

  pageFailed: (query: string, page: number, error: any) => {
    syncDebugLog('PAGE_FAILED', { 
      query,
      page,
      timestamp: Date.now()
    }, error);
  },

  // Offer level
  offerPrefetchStarted: (query: string, productIds: string[]) => {
    syncDebugLog('OFFER_PREFETCH_STARTED', { 
      query,
      productCount: productIds.length,
      productIds: productIds.slice(0, 5), // First 5 for logging
      timestamp: Date.now()
    });
  },

  offerFetched: (productId: string, query: string, offerCount: number) => {
    syncDebugLog('OFFER_FETCHED', { 
      productId,
      query,
      offerCount,
      timestamp: Date.now()
    });
  },

  offerFailed: (productId: string, query: string, error: any) => {
    syncDebugLog('OFFER_FAILED', { 
      productId,
      query,
      timestamp: Date.now()
    }, error);
  },

  // IndexedDB operations
  dbCleared: () => {
    syncDebugLog('DB_CLEARED', { 
      timestamp: Date.now()
    });
  },

  productsSaved: (query: string, pageCount: number, totalResults: number) => {
    syncDebugLog('PRODUCTS_SAVED', { 
      query,
      pageCount,
      totalResults,
      timestamp: Date.now()
    });
  },

  offersSaved: (productId: string, query: string, offerCount: number) => {
    syncDebugLog('OFFERS_SAVED', { 
      productId,
      query,
      offerCount,
      timestamp: Date.now()
    });
  },

  // Dialog interactions
  dialogOpened: () => {
    syncDebugLog('DIALOG_OPENED', { 
      timestamp: Date.now()
    });
  },

  dialogClosed: (synced: boolean, queriesCompleted?: number) => {
    syncDebugLog('DIALOG_CLOSED', { 
      synced,
      queriesCompleted,
      timestamp: Date.now()
    });
  },

  // Rate limiting
  rateLimited: (query: string, type: 'page' | 'offer', retryAfter?: number) => {
    syncDebugLog('RATE_LIMITED', { 
      query,
      type,
      retryAfter,
      timestamp: Date.now()
    });
  },

  // Network issues
  networkError: (query: string, type: 'page' | 'offer', error: any) => {
    syncDebugLog('NETWORK_ERROR', { 
      query,
      type,
      timestamp: Date.now()
    }, error);
  },

  // Test function
  test: () => {
    syncDebug.syncStarted(5);
    syncDebug.queryStarted('iphone', 'en', 2);
    syncDebug.pageFetched('iphone', 1, 20);
    syncDebug.pageFetched('iphone', 2, 15);
    syncDebug.offerPrefetchStarted('iphone', ['123', '456', '789']);
    syncDebug.offerFetched('123', 'iphone', 8);
    syncDebug.offerFailed('456', 'iphone', new Error('404 Not Found'));
    syncDebug.queryCompleted('iphone', 35, [1, 2]);
    syncDebug.syncCompleted(5, 120, 45);
    
    return 'Sync debug events sent to logger';
  }
};

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).syncDebug = syncDebug;
}