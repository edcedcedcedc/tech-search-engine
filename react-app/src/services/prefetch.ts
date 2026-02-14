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
    productIds.forEach(id => {
      if (!this.queue.has(id)) {
        this.queue.add(id);
        this.queryContext.set(id, searchQuery);
        uiLog(`[Prefetch] Added to queue: ${id} (query: "${searchQuery}")`);
      }
    });
    
    this.processQueue();
  }

  /**
   * Add product page to prefetch queue (NEW)
   * Prefetches the next page of search results
   */
 addProductPageToQueue(query: string, lang: string = 'en', page: number, itemsPerPage: number) {
  const baseCacheKey = `${query}-${lang || 'en'}`;
  
  uiLog(`[Prefetch] Checking if page ${page} for "${baseCacheKey}" should be prefetched`);
  
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
      
      uiLog(`[Prefetch] Added page ${page} to queue: ${baseCacheKey}`);
      this.processProductQueue();
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
        uiLog(`[Prefetch] Product page ${page} already cached for: ${baseCacheKey}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    uiLog(`[Prefetch] Failed to check IndexedDB for ${baseCacheKey} page ${page}: ${error}`);
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
    if (this.isProcessingProducts) return;
    if (this.productQueue.size === 0) return;

    this.isProcessingProducts = true;
    uiLog(`[Prefetch] Processing product page queue (${this.productQueue.size} items)`);

    // Sort by priority (high first)
    const queueArray = Array.from(this.productQueue.entries())
      .sort((a, b) => {
        const priorityA = a[1].priority === 'high' ? 1 : 0;
        const priorityB = b[1].priority === 'high' ? 1 : 0;
        return priorityB - priorityA;
      });

    for (let i = 0; i < queueArray.length; i += this.maxConcurrent) {
      const chunk = queueArray.slice(i, i + this.maxConcurrent);
      
      await Promise.all(
        chunk.map(([cacheKey, params]) => 
          this.prefetchProductPage(cacheKey, params)
        )
      );
    }

    this.isProcessingProducts = false;
    uiLog(`[Prefetch] Product page queue processing complete`);
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

      uiLog(`[Prefetch] Fetching product page: ${cacheKey}`);
      
      const data = await searchProducts(
        params.query,
        params.lang,
        params.itemsPerPage,
        cursor,
        undefined,
        { signal: controller.signal }
      );

      if (data.products && data.products.length > 0) {
        // FIRST: Get existing cached data
        const baseCacheKey = `${params.query}-${params.lang || 'en'}`;
        const existingCache = await indexedDbService.getProducts(baseCacheKey);
        
        // THEN: Merge with new page data
        const mergedPageCache = {
          ...(existingCache?.pageCache || {}),
          [params.page]: data.products
        };

        // Save merged cache
        await indexedDbService.saveProducts(
          baseCacheKey,
          data.products,  // Current page products
          params.page,
          data.total_count,
          mergedPageCache  // ← Pass the merged cache!
        );

        uiLog(`[Prefetch] Cached product page: ${cacheKey} (${data.products.length} products)`);

  
          //prefetch half of the view
          const halfProducts = data.products.slice(0, Math.ceil(data.products.length / 2));
          const productIds = halfProducts.map(p => p.id).filter(Boolean);
        
        if (productIds.length > 0) {
          this.addToQueue(productIds, params.query);
        }
      }

      this.productQueue.delete(cacheKey);
      this.productAbortControllers.delete(cacheKey);
      
    } catch (error: any) {
      if (error.code === "ABORTED" || error.name === 'AbortError') {
        uiLog(`[Prefetch] Aborted product page: ${cacheKey}`);
      } else {
        uiLog(`[Prefetch] Failed product page: ${cacheKey} - ${error.message || error}`);
      }
      
      this.productQueue.delete(cacheKey);
      this.productAbortControllers.delete(cacheKey);
    }
  }

  /**
   * Remove product IDs from queue (if user navigates away)
   */
  removeFromQueue(productIds: string[]) {
    productIds.forEach(id => {
      // Abort any ongoing fetch
      const controller = this.abortControllers.get(id);
      if (controller) {
        controller.abort();
        this.abortControllers.delete(id);
      }
      
      this.queue.delete(id);
      this.queryContext.delete(id);
    });
  }

  /**
   * Remove product pages from queue (NEW)
   */
  removeProductPagesFromQueue(query: string, lang: string, pages?: number[]) {
    const toRemove: string[] = [];
    
    this.productQueue.forEach((params, cacheKey) => {
      if (params.query === query && params.lang === lang) {
        if (!pages || pages.includes(params.page)) {
          toRemove.push(cacheKey);
        }
      }
    });

    toRemove.forEach(cacheKey => {
      const controller = this.productAbortControllers.get(cacheKey);
      if (controller) {
        controller.abort();
        this.productAbortControllers.delete(cacheKey);
      }
      this.productQueue.delete(cacheKey);
    });

    uiLog(`[Prefetch] Removed ${toRemove.length} product pages from queue`);
  }

  /**
   * Process queue in background with concurrency limit
   */
  private async processQueue() {
    if (this.isProcessing) return;
    if (this.queue.size === 0) return;

    this.isProcessing = true;
    uiLog(`[Prefetch] Processing queue (${this.queue.size} items)`);

    const queueArray = Array.from(this.queue);
    
    // Process in chunks
    for (let i = 0; i < queueArray.length; i += this.maxConcurrent) {
      const chunk = queueArray.slice(i, i + this.maxConcurrent);
      
      await Promise.all(
        chunk.map(id => this.prefetchProductOffers(id))
      );
    }

    this.isProcessing = false;
    uiLog(`[Prefetch] Queue processing complete`);
  }

  /**
   * Prefetch a single product's offers
   */
  private async prefetchProductOffers(productId: string) {
    // Check if already in IndexedDB
    try {
      const cached = await indexedDbService.getOffers(productId);
      if (cached && cached.offers.length > 0) {
        uiLog(`[Prefetch] Already cached: ${productId}`);
        this.queue.delete(productId);
        this.queryContext.delete(productId);
        return;
      }
    } catch (error) {
      // Continue to fetch
    }

    // Create abort controller for this request
    const controller = new AbortController();
    this.abortControllers.set(productId, controller);

    try {
      // Get the query context for this product
      const searchQuery = this.queryContext.get(productId) || '';
      
      uiLog(`[Prefetch] Fetching: ${productId} (query: "${searchQuery}")`);
      
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
        await indexedDbService.saveOffers(productId, data.offers);
        uiLog(`[Prefetch] Cached: ${productId} (${data.offers.length} offers)`);
      }

      // Cleanup
      this.queue.delete(productId);
      this.queryContext.delete(productId);
      this.abortControllers.delete(productId);

    } catch (error: any) {
      if (error.code === "ABORTED" || error.name === 'AbortError') {
        uiLog(`[Prefetch] Aborted: ${productId}`);
      } else {
        uiLog(`[Prefetch] Failed: ${productId} - ${error.message || error}`);
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
    // Abort all ongoing requests
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    this.queue.clear();
    this.queryContext.clear();
    
    // Also clear product queue
    this.productAbortControllers.forEach(controller => controller.abort());
    this.productAbortControllers.clear();
    this.productQueue.clear();
    
    uiLog(`[Prefetch] Queue cleared`);
  }

  /**
   * Get queue size
   */
  getQueueSize() {
    return this.queue.size;
  }

  /**
   * Get product queue size (NEW)
   */
  getProductQueueSize() {
    return this.productQueue.size;
  }

  /**
   * Cancel prefetch for specific product page (NEW)
   */
  cancelProductPagePrefetch(query: string, lang: string, page: number) {
    const cacheKey = this.generateProductCacheKey(query, lang, page);
    const controller = this.productAbortControllers.get(cacheKey);
    
    if (controller) {
      controller.abort();
      this.productAbortControllers.delete(cacheKey);
    }
    
    this.productQueue.delete(cacheKey);
    uiLog(`[Prefetch] Cancelled product page: ${cacheKey}`);
  }
}

// Singleton instance
export const prefetchService = new PrefetchService();