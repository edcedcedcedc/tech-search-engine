/**
 * IndexedDB Configuration for Strugure
 */

// Detect environment using browser-only checks
const isDevelopment = (): boolean => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && window.location) {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('.local');
  }
  
  // Default to false in non-browser environments (service workers, etc.)
  return false;
};

export const INDEXED_DB_CONFIG = {
  // Database configuration
  db: {
    name: 'pricecomp-db',
    version: 1,
    stores: {
      products: 'products',
      offers: 'offers'
    }
  },

  // Cache expiration times (in milliseconds)
  cache: {
    // Product search results expiration (24 hours)
    productsTtl: 12 * 60 * 60 * 1000,
    
    // Product offers expiration (1 hour)
    offersTtl: 12 * 60 * 60 * 1000,
    
    // Maximum age for stale-while-revalidate pattern
    staleWhileRevalidate: 5 * 60 * 1000 // 5 minutes
  },

  // Storage limits
  limits: {
    // Maximum number of product searches to store
    maxProductsEntries: 100,
    
    // Maximum number of offers to store
    maxOffersEntries: 500,
    
    // Maximum page cache size per product query
    maxPageCachePerKey: 10,
    
    // Maximum items per page
    maxItemsPerPage: 50
  },

  // Performance settings
  performance: {
    // Enable compression for large datasets
    enableCompression: false,
    
    // Batch size for bulk operations
    batchSize: 50,
    
    // Transaction timeout (in milliseconds)
    transactionTimeout: 5000
  },

  // Debug settings
  debug: {
    // Enable verbose logging in development
    verbose: isDevelopment(),
    
    // Log database operations
    logOperations: true,
    
    // Log cache hits/misses
    logCacheEvents: true,
    
    // Monitor storage usage
    monitorStorage: false
  },

  // Store-specific configuration
  stores: {
    products: {
      keyPath: 'key',
      indexes: [
        { name: 'updatedAt', keyPath: 'updatedAt' }
      ],
      cleanup: {
        // Remove entries older than 7 days
        maxAge: 7 * 24 * 60 * 60 * 1000,
        // Keep minimum 10 most recent entries
        minEntries: 10
      }
    },
    offers: {
      keyPath: 'productId',
      indexes: [
        { name: 'fetchedAt', keyPath: 'fetchedAt' }
      ],
      cleanup: {
        // Remove offers older than 24 hours
        maxAge: 24 * 60 * 60 * 1000,
        // Keep minimum 50 most recent offers
        minEntries: 50
      }
    }
  }
} as const;

// Type-safe configuration export
export type IndexedDbConfig = typeof INDEXED_DB_CONFIG;

// Helper functions for cache validation
export const isProductCacheValid = (updatedAt: number): boolean => {
  return Date.now() - updatedAt < INDEXED_DB_CONFIG.cache.productsTtl;
};

export const isOfferCacheValid = (fetchedAt: number): boolean => {
  return Date.now() - fetchedAt < INDEXED_DB_CONFIG.cache.offersTtl;
};

export const isStaleButUsable = (timestamp: number): boolean => {
  const age = Date.now() - timestamp;
  return age > INDEXED_DB_CONFIG.cache.productsTtl && 
         age < INDEXED_DB_CONFIG.cache.productsTtl + INDEXED_DB_CONFIG.cache.staleWhileRevalidate;
};