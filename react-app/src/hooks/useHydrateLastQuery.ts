import { useEffect } from "react";
import { useStore, useLastQueryStore } from "../store/store";
import { uiLog } from "../webhook/client/uiDebug";

/**
 * Hook that hydrates the last search query from IndexedDB (or store fallback)
 * and triggers a searchProducts call on mount
 */
export const useHydrateLastQuery = () => {
  useEffect(() => {
    const hydrateLastQuery = async () => {
      const { searchProducts } = useStore.getState();
      const { lastQuery, lastQueryLang } = useLastQueryStore.getState();

      if (lastQuery) {
        uiLog(`[useHydrateLastQuery] Hydrating last query from LastQueryStore:", ${lastQuery}`);
        // Trigger the search using stored query, lang, and page
        await searchProducts(lastQuery, lastQueryLang, 1, true);
      }
    };

    hydrateLastQuery();
  }, []);
};