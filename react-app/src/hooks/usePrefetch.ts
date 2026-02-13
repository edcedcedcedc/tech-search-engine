// hooks/usePrefetch.ts
import { useEffect } from 'react';
import { prefetchService } from '../services/prefetch';
import { useLastQueryStore } from '../store/store';
import { useStore } from "../store/store"

/**
 * Hook to manage prefetching behavior
 * Automatically cancels prefetches for previous queries when query changes
 */
export function usePrefetch() {
  const { lastQuery, lastQueryLang } = useLastQueryStore();
  const { query: currentQuery } = useStore();

  // Cancel prefetches for previous query when query changes
  useEffect(() => {
    // Only cancel if we have a lastQuery AND it's different from current query
    // Also don't cancel if lastQuery is null/empty
    if (lastQuery && lastQuery.trim() !== '' && lastQuery !== currentQuery) {
      console.debug(`[usePrefetch] Query changed from "${lastQuery}" to "${currentQuery}" - canceling prefetches`);
      prefetchService.removeProductPagesFromQueue(lastQuery, lastQueryLang);
    }
  }, [currentQuery, lastQuery, lastQueryLang]);

  // Cancel all prefetches on unmount
  useEffect(() => {
    return () => {
      if (lastQuery && lastQuery.trim() !== '') {
        console.debug(`[usePrefetch] Component unmounting - canceling prefetches for "${lastQuery}"`);
        prefetchService.removeProductPagesFromQueue(lastQuery, lastQueryLang);
      }
    };
  }, [lastQuery, lastQueryLang]);

  // Manual cleanup function for specific query
  const cancelPrefetches = (query: string, lang: string = 'en') => {
    prefetchService.removeProductPagesFromQueue(query, lang);
  };

  // Clear all prefetches
  const clearAllPrefetches = () => {
    prefetchService.clearQueue();
  };

  return {
    cancelPrefetches,
    clearAllPrefetches,
  };
}