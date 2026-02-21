import { useEffect, useRef } from "react";
import { useStore } from "../store/store";
import { uiLog } from "../webhook/client/uiDebug";
import { indexedDbService } from "../services/indexedDb";
import { INDEXED_DB_CONFIG } from "../config/indexeddb.config";

export const useSyncDb = () => {
  const openSessionExpired = useStore((s) => s.openSessionExpired);

  const intervalRef = useRef<any | null>(null);
  const isRunningRef = useRef(false);
  const timeoutRef = useRef<any | null>(null);

  // Check if user has any active data (queries, cache, etc.)
  const hasUserData = async (): Promise<boolean> => {
    try {
      // Check IndexedDB for any cached products
      const productKeys = await indexedDbService.getAllProductKeys();
      if (productKeys.length > 0) {
        uiLog(`[SyncDb] Found ${productKeys.length} product caches in IndexedDB`);
        return true;
      }

      // Check IndexedDB for any cached offers
      const offerKeys = await indexedDbService.getAllOfferKeys();
      if (offerKeys.length > 0) {
        uiLog(`[SyncDb] Found ${offerKeys.length} offer caches in IndexedDB`);
        return true;
      }

      // Check Zustand cache in sessionStorage
      const zustandCache = sessionStorage.getItem("pricecomp-store");
      if (zustandCache) {
        const parsed = JSON.parse(zustandCache);
        if (parsed.state?.multiQueryCache && 
            Object.keys(parsed.state.multiQueryCache).length > 0) {
          uiLog(`[SyncDb] Found cached queries in sessionStorage`);
          return true;
        }
      }

      uiLog(`[SyncDb] No user data found - user is new or has cleared data`);
      return false;
    } catch (err: any) {
      uiLog(`[SyncDb] Error checking user data: ${err?.message}`);
      return false; // Assume no data on error to be safe
    }
  };

  // Function to get 24 hour interval
  const get24HourInterval = (): number => {
    return 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  };

  // Schedule next run in 24 hours
  const scheduleNextRun = (callback: () => Promise<void>) => {
    const nextInterval = get24HourInterval();
    const nextRunTime = new Date(Date.now() + nextInterval);
    uiLog(`[SyncDb] Next check scheduled in 24 hours at ${nextRunTime.toLocaleString()}`);
    
    timeoutRef.current = setTimeout(async () => {
      await callback();
      scheduleNextRun(callback); // Schedule next after this one completes
    }, nextInterval);
  };

  // Check if any cache entry has expired based on timestamp
  const checkCacheExpiration = async (): Promise<boolean> => {
    try {
      uiLog(`[SyncDb] Checking cache expiration based on timestamps...`);
      
      // First check if user has any data at all
      const hasData = await hasUserData();
      if (!hasData) {
        uiLog(`[SyncDb] No user data found, skipping cache expiration check`);
        return false;
      }
      
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
              uiLog(`[SyncDb] Found expired product: ${productKeys[i]}, age: ${Math.round(age / 1000 / 60 / 60)} hours`);
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
              uiLog(`[SyncDb] Found expired offer for product: ${offerKeys[i]}, age: ${Math.round(age / 1000 / 60 / 60)} hours`);
            }
          }
        }
        
        if (expiredCount > 0) {
          uiLog(`[SyncDb] Found ${expiredCount} expired offer caches out of ${sampleSize} sampled`);
          return true;
        }
      }

      uiLog(`[SyncDb] No expired cache found - all cached data is fresh`);
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
      uiLog(`[SyncDb] Starting 24-hour background check...`);
      
      // Check if user has any data at all
      const hasData = await hasUserData();
      if (!hasData) {
        uiLog(`[SyncDb] No user data found, skipping cache check`);
        return;
      }
      
      // Check cache expiration based on timestamps
      const cacheExpired = await checkCacheExpiration();
      
      if (cacheExpired) {
        uiLog(`[SyncDb] Expired cache detected based on timestamp comparison, triggering session expiration`);
        openSessionExpired();
        return;
      }

      const duration = Date.now() - startTime;
      uiLog(`[SyncDb] 24-hour background check completed in ${duration}ms - all caches are fresh`);

    } catch (err: any) {
      uiLog(`[SyncDb] Background check failed: ${err?.message}`);
    } finally {
      isRunningRef.current = false;
    }
  };

  useEffect(() => {
    uiLog(`[SyncDb] Initializing 24-hour background sync hook`);
    
    // Check if user has data before starting periodic checks
    hasUserData().then(hasData => {
      if (hasData) {
        uiLog(`[SyncDb] User has data, starting 24-hour periodic checks`);
        // Run immediately on mount
        performBackgroundCheck();
        // Schedule subsequent runs every 24 hours
        scheduleNextRun(performBackgroundCheck);
      } else {
        uiLog(`[SyncDb] No user data found, sync hook idle - will check once`);
        // Run once to be safe (maybe user just cleared data)
        performBackgroundCheck();
      }
    });

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