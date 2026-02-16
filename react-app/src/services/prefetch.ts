import { indexedDbService } from "./indexedDb";
import { getProductOffers, searchProducts } from "../api/searchApi";
import { uiLog } from "../webhook/client/uiDebug";
import type { AggregatedProduct } from "../types/AggregatedProduct";

// Queue management
class PrefetchService {
  private queue: Set<string> = new Set();
  private queryContext: Map<string, string> = new Map(); // Store query per product
  private isProcessing = false;
  private maxConcurrent = 10;
  private abortControllers: Map<string, AbortController> = new Map();

  // Product queue for prefetching product pages
  private productQueue: Map<string, { 
    query: string; 
    lang: string; 
    page: number; 
    itemsPerPage: number;
    priority: 'high' | 'low';
  }> = new Map();
  
  private productAbortControllers: Map<string, AbortController> = new Map();
  private isProcessingProducts = false;

  /**
   * Add product IDs to prefetch queue with search context
   */
  addToQueue(productIds: string[], searchQuery: string = '') {
    uiLog(`[Prefetch][addToQueue] Adding ${productIds.length} product IDs, query="${searchQuery}"`);
    if (productIds.length > 0) {
      uiLog(`[Prefetch][addToQueue] First 5 IDs: ${productIds.slice(0, 5).join(', ')}${productIds.length > 5 ? `... (${productIds.length-5} more)` : ''}`);
    }
    
    productIds.forEach(id => {
      if (!this.queue.has(id)) {
        this.queue.add(id);
        this.queryContext.set(id, searchQuery);
        uiLog(`[Prefetch][addToQueue] Added to queue: ${id} (query: "${searchQuery}")`);
      } else {
        uiLog(`[Prefetch][addToQueue] Product ${id} already in queue, skipping`);
      }
    });
    
    uiLog(`[Prefetch][addToQueue] Queue size now: ${this.queue.size}`);
    this.processQueue();
  }

  /**
   * Add product page to prefetch queue (NEW)
   * Prefetches the next page of search results
   */
 addProductPageToQueue(query: string, lang: string = 'en', page: number, itemsPerPage: number) {
  const baseCacheKey = `${query}-${lang || 'en'}`;
  
  uiLog(`[Prefetch][addProductPageToQueue] Checking if page ${page} for "${baseCacheKey}" should be prefetched`);
  
  this.shouldPrefetchProductPage(query, lang, page, itemsPerPage).then(shouldPrefetch => {
    if (shouldPrefetch) {
      const queueKey = `${baseCacheKey}-page-${page}`;
      this.productQueue.set(queueKey, {
        query,
        lang,
        page,
        itemsPerPage,
        priority: page === 2 ? 'high' : 'low'
      });
      
      uiLog(`[Prefetch][addProductPageToQueue] Added page ${page} to queue: ${baseCacheKey} (priority: ${page === 2 ? 'high' : 'low'})`);
      uiLog(`[Prefetch][addProductPageToQueue] Product queue size now: ${this.productQueue.size}`);
      this.processProductQueue();
    } else {
      uiLog(`[Prefetch][addProductPageToQueue] Page ${page} already cached, skipping`);
    }
  });
}
  /**
   * Prefetch multiple subsequent pages (NEW)
   */
  prefetchNextPages(
  query: string, 
  lang: string, 
  currentPage: number, 
  itemsPerPage: number, 
  pagesToPrefetch: number = 2
) {
  uiLog(`[Prefetch][prefetchNextPages] Prefetching ${pagesToPrefetch} pages for query="${query}", currentPage=${currentPage}`);
  
  for (let i = 1; i <= pagesToPrefetch; i++) {
    const nextPage = currentPage + i;
    this.addProductPageToQueue(query, lang, nextPage, itemsPerPage);
  }
}

 private async shouldPrefetchProductPage(
  query: string, 
  lang: string, 
  page: number, 
  itemsPerPage: number
): Promise<boolean> {
  // Use the SAME cache key format as the store!
  const baseCacheKey = `${query}-${lang || 'en'}`;
  
  try {
    // Check IndexedDB using the base cache key
    const cached = await indexedDbService.getProducts(baseCacheKey);
    
    if (cached && cached.pageCache && cached.pageCache[page]) {
      const pageData = cached.pageCache[page];
      if (pageData && pageData.length > 0) {
        uiLog(`[Prefetch][shouldPrefetch] Product page ${page} already cached for: ${baseCacheKey} (${pageData.length} products)`);
        return false;
      }
    }
    
    uiLog(`[Prefetch][shouldPrefetch] Product page ${page} not cached, will prefetch`);
    return true;
  } catch (error) {
    uiLog(`[Prefetch][shouldPrefetch] Failed to check IndexedDB for ${baseCacheKey} page ${page}: ${error}`);
    return true;
  }
}

  /**
   * Generate cache key for product page (NEW)
   */
  private generateProductCacheKey(query: string, lang: string, page: number): string {
    return `${query}-${lang || 'en'}-page-${page}`;
  }

  /**
   * Process product queue in background with concurrency limit (NEW)
   */
  private async processProductQueue() {
    if (this.isProcessingProducts) {
      uiLog(`[Prefetch][processProductQueue] Already processing, skipping`);
      return;
    }
    if (this.productQueue.size === 0) {
      uiLog(`[Prefetch][processProductQueue] Queue empty, skipping`);
      return;
    }

    this.isProcessingProducts = true;
    uiLog(`[Prefetch][processProductQueue] Processing product page queue (${this.productQueue.size} items)`);

    // Sort by priority (high first)
    const queueArray = Array.from(this.productQueue.entries())
      .sort((a, b) => {
        const priorityA = a[1].priority === 'high' ? 1 : 0;
        const priorityB = b[1].priority === 'high' ? 1 : 0;
        return priorityB - priorityA;
      });

    uiLog(`[Prefetch][processProductQueue] Queue breakdown: high=${queueArray.filter(([_, p]) => p.priority === 'high').length}, low=${queueArray.filter(([_, p]) => p.priority === 'low').length}`);

    for (let i = 0; i < queueArray.length; i += this.maxConcurrent) {
      const chunk = queueArray.slice(i, i + this.maxConcurrent);
      uiLog(`[Prefetch][processProductQueue] Processing chunk ${i/this.maxConcurrent + 1}: ${chunk.map(([key]) => key).join(', ')}`);
      
      await Promise.all(
        chunk.map(([cacheKey, params]) => 
          this.prefetchProductPage(cacheKey, params)
        )
      );
    }

    this.isProcessingProducts = false;
    uiLog(`[Prefetch][processProductQueue] Product page queue processing complete`);
  }

  /**
   * Prefetch a single product page (NEW)
   */
  private async prefetchProductPage(
    cacheKey: string,
    params: { query: string; lang: string; page: number; itemsPerPage: number }
  ) {
    const controller = new AbortController();
    this.productAbortControllers.set(cacheKey, controller);

    try {
      const cursor = params.page > 1 
        ? ((params.page - 1) * params.itemsPerPage).toString() 
        : undefined;

      uiLog(`[Prefetch][prefetchProductPage] Fetching product page: ${cacheKey} (page=${params.page}, limit=${params.itemsPerPage})`);
      
      const data = await searchProducts(
        params.query,
        params.lang,
        params.itemsPerPage,
        cursor,
        undefined,
        { signal: controller.signal }
      );

      if (data.products && data.products.length > 0) {
        uiLog(`[Prefetch][prefetchProductPage] Received ${data.products.length} products for ${cacheKey}`);
        
        // FIRST: Get existing cached data
        const baseCacheKey = `${params.query}-${params.lang || 'en'}`;
        const existingCache = await indexedDbService.getProducts(baseCacheKey);
        
        uiLog(`[Prefetch][prefetchProductPage] Existing cache for ${baseCacheKey}: ${existingCache ? Object.keys(existingCache.pageCache || {}).length : 0} pages`);
        
        // THEN: Merge with new page data
        const mergedPageCache = {
          ...(existingCache?.pageCache || {}),
          [params.page]: data.products
        };

        uiLog(`[Prefetch][prefetchProductPage] Merged cache now has ${Object.keys(mergedPageCache).length} pages`);

        // Save merged cache
        await indexedDbService.saveProducts(
          baseCacheKey,
          data.products,  // Current page products
          params.page,
          data.total_count,
          mergedPageCache  // ← Pass the merged cache!
        );

        uiLog(`[Prefetch][prefetchProductPage] Cached product page: ${cacheKey} (${data.products.length} products)`);

        //prefetch half of the view
        const halfProducts = data.products.slice(0, Math.ceil(data.products.length / 2));
        const productIds = halfProducts.map(p => p.id).filter(Boolean);
        
        if (productIds.length > 0) {
          uiLog(`[Prefetch][prefetchProductPage] Triggering offer prefetch for ${productIds.length} products from page ${params.page}`);
          this.addToQueue(productIds, params.query);
        }
      } else {
        uiLog(`[Prefetch][prefetchProductPage] No products returned for ${cacheKey}`);
      }

      this.productQueue.delete(cacheKey);
      this.productAbortControllers.delete(cacheKey);
      
    } catch (error: any) {
      if (error.code === "ABORTED" || error.name === 'AbortError') {
        uiLog(`[Prefetch][prefetchProductPage] Aborted product page: ${cacheKey}`);
      } else {
        uiLog(`[Prefetch][prefetchProductPage] Failed product page: ${cacheKey} - ${error.message || error}`);
      }
      
      this.productQueue.delete(cacheKey);
      this.productAbortControllers.delete(cacheKey);
    }
  }

  /**
   * Remove product IDs from queue (if user navigates away)
   */
  removeFromQueue(productIds: string[]) {
    uiLog(`[Prefetch][removeFromQueue] Removing ${productIds.length} product IDs from queue`);
    uiLog(`[Prefetch][removeFromQueue] IDs: ${productIds.slice(0, 5).join(', ')}${productIds.length > 5 ? `... (${productIds.length-5} more)` : ''}`);
    
    productIds.forEach(id => {
      // Abort any ongoing fetch
      const controller = this.abortControllers.get(id);
      if (controller) {
        uiLog(`[Prefetch][removeFromQueue] Aborting fetch for ${id}`);
        controller.abort();
        this.abortControllers.delete(id);
      }
      
      const removed = this.queue.delete(id);
      this.queryContext.delete(id);
      
      if (removed) {
        uiLog(`[Prefetch][removeFromQueue] Removed ${id} from queue`);
      }
    });
    
    uiLog(`[Prefetch][removeFromQueue] Queue size now: ${this.queue.size}`);
  }

  /**
   * Remove product pages from queue (NEW)
   */
  removeProductPagesFromQueue(query: string, lang: string, pages?: number[]) {
    uiLog(`[Prefetch][removeProductPagesFromQueue] Removing pages for query="${query}", lang=${lang}${pages ? `, pages=[${pages.join(',')}]` : ', all pages'}`);
    
    const toRemove: string[] = [];
    
    this.productQueue.forEach((params, cacheKey) => {
      if (params.query === query && params.lang === lang) {
        if (!pages || pages.includes(params.page)) {
          toRemove.push(cacheKey);
        }
      }
    });

    uiLog(`[Prefetch][removeProductPagesFromQueue] Found ${toRemove.length} pages to remove`);

    toRemove.forEach(cacheKey => {
      const controller = this.productAbortControllers.get(cacheKey);
      if (controller) {
        uiLog(`[Prefetch][removeProductPagesFromQueue] Aborting fetch for ${cacheKey}`);
        controller.abort();
        this.productAbortControllers.delete(cacheKey);
      }
      this.productQueue.delete(cacheKey);
    });

    uiLog(`[Prefetch][removeProductPagesFromQueue] Removed ${toRemove.length} product pages from queue`);
    uiLog(`[Prefetch][removeProductPagesFromQueue] Product queue size now: ${this.productQueue.size}`);
  }

  /**
   * Process queue in background with concurrency limit
   */
  private async processQueue() {
    if (this.isProcessing) {
      uiLog(`[Prefetch][processQueue] Already processing, skipping`);
      return;
    }
    if (this.queue.size === 0) {
      uiLog(`[Prefetch][processQueue] Queue empty, skipping`);
      return;
    }

    this.isProcessing = true;
    uiLog(`[Prefetch][processQueue] Processing queue (${this.queue.size} items)`);

    const queueArray = Array.from(this.queue);
    uiLog(`[Prefetch][processQueue] Queue items: ${queueArray.slice(0, 10).join(', ')}${queueArray.length > 10 ? `... (${queueArray.length-10} more)` : ''}`);
    
    // Process in chunks
    for (let i = 0; i < queueArray.length; i += this.maxConcurrent) {
      const chunk = queueArray.slice(i, i + this.maxConcurrent);
      uiLog(`[Prefetch][processQueue] Processing chunk ${i/this.maxConcurrent + 1}: ${chunk.join(', ')}`);
      
      await Promise.all(
        chunk.map(id => this.prefetchProductOffers(id))
      );
    }

    this.isProcessing = false;
    uiLog(`[Prefetch][processQueue] Queue processing complete`);
  }

  /**
   * Prefetch a single product's offers
   */
  private async prefetchProductOffers(productId: string) {
    uiLog(`[Prefetch][prefetchProductOffers] Checking product ${productId}`);
    
    // Check if already in IndexedDB
    try {
      const cached = await indexedDbService.getOffers(productId);
      if (cached && cached.offers.length > 0) {
        uiLog(`[Prefetch][prefetchProductOffers] Already cached: ${productId} (${cached.offers.length} offers)`);
        this.queue.delete(productId);
        this.queryContext.delete(productId);
        return;
      } else {
        uiLog(`[Prefetch][prefetchProductOffers] No cached offers found for ${productId}`);
      }
    } catch (error) {
      uiLog(`[Prefetch][prefetchProductOffers] Error checking cache for ${productId}: ${error}`);
      // Continue to fetch
    }

    // Create abort controller for this request
    const controller = new AbortController();
    this.abortControllers.set(productId, controller);

    try {
      // Get the query context for this product
      const searchQuery = this.queryContext.get(productId) || '';
      
      uiLog(`[Prefetch][prefetchProductOffers] Fetching: ${productId} (query: "${searchQuery}")`);
      
      const data = await getProductOffers(
        productId, 
        true,  // includeMetadata
        searchQuery, //
        undefined, // limit
        undefined, // cursor
        0,         // retry429
        0,         // retry500
        { signal: controller.signal } 
      );

      if (data.offers && data.offers.length > 0) {
        uiLog(`[Prefetch][prefetchProductOffers] Received ${data.offers.length} offers for ${productId}`);
        
        // VALIDATION: Check if offers exceed max (should never happen)
        if (data.offers.length > 50) {
          uiLog(`[Prefetch][prefetchProductOffers] ⚠️ WARNING: Prefetched ${data.offers.length} offers (exceeds max 50)!`);
        }
        
        await indexedDbService.saveOffers(productId, data.offers);
        uiLog(`[Prefetch][prefetchProductOffers] Cached: ${productId} (${data.offers.length} offers)`);
      } else {
        uiLog(`[Prefetch][prefetchProductOffers] No offers returned for ${productId}`);
      }

      // Cleanup
      this.queue.delete(productId);
      this.queryContext.delete(productId);
      this.abortControllers.delete(productId);

    } catch (error: any) {
      if (error.code === "ABORTED" || error.name === 'AbortError') {
        uiLog(`[Prefetch][prefetchProductOffers] Aborted: ${productId}`);
      } else {
        uiLog(`[Prefetch][prefetchProductOffers] Failed: ${productId} - ${error.message || error}`);
      }
      
      // Cleanup
      this.queue.delete(productId);
      this.queryContext.delete(productId);
      this.abortControllers.delete(productId);
    }
  }

  /**
   * Clear entire queue
   */
  clearQueue() {
    uiLog(`[Prefetch][clearQueue] Clearing all queues`);
    uiLog(`[Prefetch][clearQueue] Offer queue size: ${this.queue.size}, Product queue size: ${this.productQueue.size}`);
    
    // Abort all ongoing requests
    this.abortControllers.forEach((controller, id) => {
      uiLog(`[Prefetch][clearQueue] Aborting fetch for ${id}`);
      controller.abort();
    });
    this.abortControllers.clear();
    this.queue.clear();
    this.queryContext.clear();
    
    // Also clear product queue
    this.productAbortControllers.forEach((controller, key) => {
      uiLog(`[Prefetch][clearQueue] Aborting product page fetch for ${key}`);
      controller.abort();
    });
    this.productAbortControllers.clear();
    this.productQueue.clear();
    
    uiLog(`[Prefetch][clearQueue] All queues cleared`);
  }

  /**
   * Get queue size
   */
  getQueueSize() {
    uiLog(`[Prefetch][getQueueSize] Offer queue size: ${this.queue.size}`);
    return this.queue.size;
  }

  /**
   * Get product queue size (NEW)
   */
  getProductQueueSize() {
    uiLog(`[Prefetch][getProductQueueSize] Product queue size: ${this.productQueue.size}`);
    return this.productQueue.size;
  }

  /**
   * Cancel prefetch for specific product page (NEW)
   */
  cancelProductPagePrefetch(query: string, lang: string, page: number) {
    const cacheKey = this.generateProductCacheKey(query, lang, page);
    const controller = this.productAbortControllers.get(cacheKey);
    
    uiLog(`[Prefetch][cancelProductPagePrefetch] Cancelling prefetch for ${cacheKey}`);
    
    if (controller) {
      uiLog(`[Prefetch][cancelProductPagePrefetch] Aborting fetch for ${cacheKey}`);
      controller.abort();
      this.productAbortControllers.delete(cacheKey);
    }
    
    this.productQueue.delete(cacheKey);
    uiLog(`[Prefetch][cancelProductPagePrefetch] Cancelled product page: ${cacheKey}`);
  }

cancelPrefetchesBeyondPage(query: string, lang: string, currentPage: number) {
  uiLog(`[Prefetch][cancelPrefetchesBeyondPage] Cancelling prefetches beyond page ${currentPage + 1} for query="${query}"`);
  
  const toRemove: string[] = [];
  
  this.productQueue.forEach((params, cacheKey) => {
    // Cancel prefetches for pages greater than current page + 1
    // This keeps prefetch for next page (current + 1) but cancels beyond that
    if (params.query === query && params.lang === lang && params.page > currentPage + 1) {
      toRemove.push(cacheKey);
    }
  });

  uiLog(`[Prefetch][cancelPrefetchesBeyondPage] Found ${toRemove.length} pages to cancel`);

  toRemove.forEach(cacheKey => {
    const controller = this.productAbortControllers.get(cacheKey);
    if (controller) {
      uiLog(`[Prefetch][cancelPrefetchesBeyondPage] Aborting fetch for ${cacheKey}`);
      controller.abort();
      this.productAbortControllers.delete(cacheKey);
    }
    this.productQueue.delete(cacheKey);
  });

  if (toRemove.length > 0) {
    uiLog(`[Prefetch][cancelPrefetchesBeyondPage] Cancelled ${toRemove.length} prefetches beyond page ${currentPage + 1}`);
  }
}}

// Singleton instance
export const prefetchService = new PrefetchService();