// services/syncDb.ts
import { indexedDbService } from './indexedDb';
import { searchProducts, getProductOffers } from '../api/searchApi';
import type { AggregatedProduct } from '../types/AggregatedProduct';
import type { PriceHistoryPreview, PriceTrendPreview } from '../types/PriceTrend';
import { syncDebug } from '../webhook/client/syncDebug';
import { useNotificationStore } from '../store/store';

export interface SyncProgress {
  current: number;
  total: number;
  currentQuery: string;
  productsFetched: number;
  offersFetched: number;
  totalOffersEstimate: number; // Add this field
}

type ProgressCallback = (progress: SyncProgress) => void;

class DBSyncService {
  private progressCallbacks: ProgressCallback[] = [];
  private abortController: AbortController | null = null;
  private startTime: number = 0;
  private totalProducts: number = 0;
  private totalOffers: number = 0;
  private totalOffersEstimate: number = 0;

  onProgress(callback: ProgressCallback) {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyProgress(progress: SyncProgress) {
    this.progressCallbacks.forEach(cb => cb(progress));
  }

  async syncDatabase() {
    this.abortController = new AbortController();
    this.startTime = Date.now();
    this.totalProducts = 0;
    this.totalOffers = 0;
    
    try {
      // Step 1: Get ALL existing query keys
      const productKeys = await indexedDbService.getAllProductKeys();
      
      // Step 2: Get total offers count from disk (for progress estimation)
      this.totalOffersEstimate = await indexedDbService.getOffersCount();
      
      // Log sync started with estimate
      syncDebug.syncStarted(this.totalOffersEstimate);
      
      // Step 3: Clear everything
      await indexedDbService.clearAll();
      syncDebug.dbCleared();

      // Step 4: Process EACH query
      for (let i = 0; i < productKeys.length; i++) {
        if (this.abortController.signal.aborted) {
          syncDebug.syncCancelled(i);
          throw new Error('Sync cancelled');
        }

        const key = productKeys[i];
        const [query, lang = 'en'] = key.split('-');
        
        // Update progress with estimate
        this.notifyProgress({
          current: i,
          total: productKeys.length,
          currentQuery: query,
          productsFetched: 0,
          offersFetched: this.totalOffers, // Use accumulated total
          totalOffersEstimate: this.totalOffersEstimate
        });

        // Log query started
        syncDebug.queryStarted(query, lang, 2);

        try {
          // ============= FETCH PAGE 1 =============
          let page1Data;
          try {
            page1Data = await searchProducts(
              query, 
              lang, 
              20, 
              undefined, 
              undefined, 
              { signal: this.abortController.signal }
            );
            syncDebug.pageFetched(query, 1, page1Data.products.length);
          } catch (error: any) {
            syncDebug.pageFailed(query, 1, error);
            if (error?.code === 429) syncDebug.rateLimited(query, 'page');
            if (!navigator.onLine) syncDebug.networkError(query, 'page', error);
            throw error;
          }

          // Create pageCache with page 1
          const pageCache: Record<number, AggregatedProduct[]> = {
            1: page1Data.products
          };

          // ============= FETCH PAGE 2 =============
          const totalPages = Math.ceil(page1Data.total_count / 20);
          if (totalPages >= 2) {
            try {
              const page2Data = await searchProducts(
                query,
                lang,
                20,
                '20',
                undefined,
                { signal: this.abortController.signal }
              );
              
              if (page2Data.products.length > 0) {
                pageCache[2] = page2Data.products;
                syncDebug.pageFetched(query, 2, page2Data.products.length);
              }
            } catch (error: any) {
              syncDebug.pageFailed(query, 2, error);
              if (error?.code === 429) syncDebug.rateLimited(query, 'page');
              if (!navigator.onLine) syncDebug.networkError(query, 'page', error);
              // Continue even if page 2 fails
            }
          }

          // ============= SAVE PRODUCTS =============
          await indexedDbService.saveProducts(
            key,
            page1Data.products,
            1,
            page1Data.total_count,
            pageCache
          );
          
          const pagesFetched = Object.keys(pageCache).map(Number);
          syncDebug.productsSaved(query, pagesFetched.length, page1Data.total_count);
          
          // ============= COLLECT ALL PRODUCTS FROM BOTH PAGES =============
          const allProducts = [
            ...page1Data.products,
            ...(pageCache[2] || [])
          ];

          this.totalProducts += allProducts.length;

          // ============= PREFETCH OFFERS FOR EVERY PRODUCT =============
          if (allProducts.length > 0) {
            syncDebug.offerPrefetchStarted(
              query, 
              allProducts.map(p => p.id).filter(Boolean)
            );
          }

          for (const product of allProducts) {
            if (!product.id) continue;

            try {
              // Fetch FULL offers with complete data including price_history and price_trend_preview
              const offersData = await getProductOffers(
                product.id,
                true, // Use FULL mode to get complete data
                query,
                undefined, // default limit 50
                undefined,
                0,
                0,
                { signal: this.abortController.signal }
              );

              if (offersData.offers && offersData.offers.length > 0) {
                // The API already returns the correct structure:
                // - price_trend_preview: { free_price_trend: PriceHistoryPreview[], hidden_price_trend_count: number }
                // - price_history: PriceHistoryPreview[]
                
              
                await indexedDbService.saveOffers(product.id, offersData.offers);
                syncDebug.offersSaved(product.id, query, offersData.offers.length);
                this.totalOffers += offersData.offers.length;
              }

              syncDebug.offerFetched(product.id, query, offersData.offers?.length || 0);
              
              // Update progress with accumulated total and estimate
              this.notifyProgress({
                current: i,
                total: productKeys.length,
                currentQuery: query,
                productsFetched: allProducts.length,
                offersFetched: this.totalOffers, // Send accumulated total
                totalOffersEstimate: this.totalOffersEstimate
              });

              // Small delay between offers
              await new Promise(r => setTimeout(r, 150));

            } catch (error: any) {
              syncDebug.offerFailed(product.id, query, error);
              if (error?.code === 429) syncDebug.rateLimited(query, 'offer');
              if (!navigator.onLine) syncDebug.networkError(query, 'offer', error);
            }
          }

          // Log query completed
          syncDebug.queryCompleted(query, allProducts.length, pagesFetched);

        } catch (error) {
          syncDebug.queryFailed(query, error);
         
        }

        // Delay between queries
        await new Promise(r => setTimeout(r, 800));
      }

      // Final progress update
      this.notifyProgress({
        current: productKeys.length,
        total: productKeys.length,
        currentQuery: 'Complete',
        productsFetched: this.totalProducts,
        offersFetched: this.totalOffers,
        totalOffersEstimate: this.totalOffersEstimate
      });

      // Log sync completed
      syncDebug.syncCompleted(
        productKeys.length, 
        this.totalProducts, 
        this.totalOffers
      );

      // Show success notification
      useNotificationStore.getState().addNotification({
        message: `Cache updated successfully! ${this.totalProducts} products, ${this.totalOffers} offers refreshed.`,
        type: "success",
        duration: 5000,
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Sync cancelled') {
        // Already logged in cancellation
      } else {
        syncDebug.syncFailed(error);
        // Show error notification
        useNotificationStore.getState().addNotification({
          message: `Cache update failed. Please try again.`,
          type: "error",
          duration: 5000,
        });
      }

      throw error;
    } finally {
      this.abortController = null;
    }
  }

  cancelSync() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const dbSyncService = new DBSyncService();