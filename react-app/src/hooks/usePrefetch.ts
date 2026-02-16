// hooks/usePrefetch.ts
import { useEffect, useRef } from 'react';
import { prefetchService } from '../services/prefetch';
import { useLastQueryStore } from '../store/store';
import { useStore } from "../store/store"
import { uiLog } from '../webhook/client/uiDebug';

export function usePrefetch() {
  const { lastQuery, lastQueryLang } = useLastQueryStore();
  const { query: currentQuery, currentPage } = useStore();
  const previousPageRef = useRef(currentPage);
  const previousQueryRef = useRef(currentQuery);

  // Handle query changes AND pagination in one effect
  useEffect(() => {
    // Case 1: Query changed (new search)
    if (currentQuery !== previousQueryRef.current) {
      if (previousQueryRef.current) {
        uiLog(`[usePrefetch] Query changed from "${previousQueryRef.current}" to "${currentQuery}" - canceling all prefetches`);
        prefetchService.removeProductPagesFromQueue(previousQueryRef.current, lastQueryLang);
      }
      previousQueryRef.current = currentQuery;
    }
    
    // Case 2: Page changed (pagination) - but only if query exists
    else if (previousPageRef.current !== currentPage && currentQuery) {
      uiLog(`[usePrefetch] Page changed from ${previousPageRef.current} to ${currentPage} - canceling future page prefetches`);
      
      // Cancel prefetches for pages beyond current page + 1
      // This keeps prefetch for next page but cancels further ones
      prefetchService.cancelPrefetchesBeyondPage(currentQuery, lastQueryLang, currentPage);
      
      previousPageRef.current = currentPage;
    }
  }, [currentQuery, currentPage, lastQueryLang]);

  // Cancel all prefetches on unmount
  useEffect(() => {
    return () => {
      if (currentQuery) {
        uiLog(`[usePrefetch] Component unmounting - canceling prefetches for "${currentQuery}"`);
        prefetchService.removeProductPagesFromQueue(currentQuery, lastQueryLang);
      }
    };
  }, [currentQuery, lastQueryLang]);

  return {
    cancelPrefetches: (query: string, lang: string = 'en') => {
      prefetchService.removeProductPagesFromQueue(query, lang);
    },
    clearAllPrefetches: () => {
      prefetchService.clearQueue();
    },
  };
}