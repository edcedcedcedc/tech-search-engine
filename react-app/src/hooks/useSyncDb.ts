import { useEffect, useRef } from "react";
import { useStore, useSystemStore } from "../store/store";
import { getSystemVersion } from "../api/searchApi";
import { uiLog } from "../webhook/client/uiDebug";
import { indexedDbService } from "../services/indexedDb";
import { INDEXED_DB_CONFIG } from "../config/indexeddb.config";

export const useSyncDb = () => {
  const openSessionExpired = useStore((s) => s.openSessionExpired);
  const checkSystemVersion = useSystemStore((s) => s.checkSystemVersion);

  const intervalRef = useRef<any | null>(null);
  const isRunningRef = useRef(false);
  const timeoutRef = useRef<any | null>(null);

  // Function to get random interval between 5-10 minutes (in milliseconds)
  const getRandomInterval = (): number => {
    const min = 5 * 60 * 1000; // 5 minutes
    const max = 10 * 60 * 1000; // 10 minutes
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Schedule next run with random interval
  const scheduleNextRun = (callback: () => Promise<void>) => {
    const nextInterval = getRandomInterval();
    uiLog(`[SyncDb] Next check scheduled in ${Math.round(nextInterval / 1000 / 60)} minutes`);
    
    timeoutRef.current = setTimeout(async () => {
      await callback();
      scheduleNextRun(callback); // Schedule next after this one completes
    }, nextInterval);
  };

  // Check if any cache entry has expired
  const checkCacheExpiration = async (): Promise<boolean> => {
    try {
      uiLog(`[SyncDb] Checking cache expiration...`);
      
      // Check products - sample a few to avoid performance issues
      const productKeys = await indexedDbService.getAllProductKeys();
      if (productKeys.length > 0) {
        // Check up to 10 products or all if less
        const sampleSize = Math.min(10, productKeys.length);
        let expiredCount = 0;
        
        for (let i = 0; i < sampleSize; i++) {
          const productData = await indexedDbService.getProducts(productKeys[i]);
          if (productData) {
            const age = Date.now() - productData.updatedAt;
            const isExpired = age >= INDEXED_DB_CONFIG.cache.productsTtl;
            
            if (isExpired) {
              expiredCount++;
              uiLog(`[SyncDb] Found expired product: ${productKeys[i]}, age: ${Math.round(age / 1000 / 60)} min`);
            }
          }
        }
        
        if (expiredCount > 0) {
          uiLog(`[SyncDb] Found ${expiredCount} expired product caches out of ${sampleSize} sampled`);
          return true;
        }
      }

      // Check offers - sample a few
      const offerKeys = await indexedDbService.getAllOfferKeys();
      if (offerKeys.length > 0) {
        const sampleSize = Math.min(10, offerKeys.length);
        let expiredCount = 0;
        
        for (let i = 0; i < sampleSize; i++) {
          const offerData = await indexedDbService.getOffers(offerKeys[i]);
          if (offerData) {
            const age = Date.now() - offerData.fetchedAt;
            const isExpired = age >= INDEXED_DB_CONFIG.cache.offersTtl;
            
            if (isExpired) {
              expiredCount++;
              uiLog(`[SyncDb] Found expired offer for product: ${offerKeys[i]}, age: ${Math.round(age / 1000 / 60)} min`);
            }
          }
        }
        
        if (expiredCount > 0) {
          uiLog(`[SyncDb] Found ${expiredCount} expired offer caches out of ${sampleSize} sampled`);
          return true;
        }
      }

      uiLog(`[SyncDb] No expired cache found`);
      return false;
    } catch (err: any) {
      uiLog(`[SyncDb] Cache check failed: ${err?.message}`);
      return false;
    }
  };

  // Main check function
  const performBackgroundCheck = async () => {
    // Prevent overlapping runs
    if (isRunningRef.current) {
      uiLog(`[SyncDb] Previous check still running, skipping`);
      return;
    }

    isRunningRef.current = true;
    const startTime = Date.now();

    try {
      uiLog(`[SyncDb] Starting background check...`);
      
      // First check system version (fast)
      const data = await getSystemVersion();
      const versionChanged = checkSystemVersion(data.version);
      
      if (versionChanged) {
        uiLog(`[SyncDb] System version changed, triggering session expiration`);
        openSessionExpired();
        return;
      }

      // Then check cache expiration (slower but sampled)
      const cacheExpired = await checkCacheExpiration();
      
      if (cacheExpired) {
        uiLog(`[SyncDb] Expired cache detected, triggering session expiration`);
        openSessionExpired();
        return;
      }

      const duration = Date.now() - startTime;
      uiLog(`[SyncDb] Background check completed in ${duration}ms`);

    } catch (err: any) {
      uiLog(`[SyncDb] Background check failed: ${err?.message}`);
    } finally {
      isRunningRef.current = false;
    }
  };

  useEffect(() => {
    uiLog(`[SyncDb] Initializing background sync hook`);
    
    // Run immediately on mount
    performBackgroundCheck();

    // Schedule subsequent runs with random intervals
    scheduleNextRun(performBackgroundCheck);

    // Cleanup on unmount
    return () => {
      uiLog(`[SyncDb] Cleaning up background sync hook`);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Empty deps array - run once on mount
};