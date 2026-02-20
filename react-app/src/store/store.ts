import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uiLog } from "../webhook/client/uiDebug";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { getProductOffers as apiGetProductOffers } from "../api/searchApi";
import { searchProducts as apiSearchProducts } from "../api/searchApi";
import i18n from "../i18n";
import { indexedDbService } from "../services/indexedDb";
import { prefetchService } from "../services/prefetch";
import { v4 as uuidv4 } from "uuid";
import { transformSearchResult, validateAndFixCachedProduct } from "../types/Transformer"


/* =========================
   COMPARISON STORE
========================= */

import { compareProducts } from "../api/searchApi";
import type { ComparisonResponse, ComparisonRequest } from "../api/searchApi";

interface ComparisonState {
  // State
  result: ComparisonResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  compareOffers: (request: ComparisonRequest) => Promise<void>;
  clearComparison: () => void;
  setResult: (result: ComparisonResponse | null) => void;
}

export const useComparisonStore = create<ComparisonState>()(
  (set, get) => ({
    // Initial state
    result: null,
    isLoading: false,
    error: null,

    // Actions
    compareOffers: async (request: ComparisonRequest) => {
      // Don't start another comparison if already loading
      if (get().isLoading) return;

      set({ isLoading: true, error: null });

      try {
        uiLog(`[ComparisonStore] Comparing ${request.offers.length} offers | tier=${request.tier} | lang=${request.lang}`);
        
        const result = await compareProducts(request);
        
        set({ 
          result, 
          isLoading: false,
          error: null 
        });

        uiLog(`[ComparisonStore] Comparison complete | best_choice=${result.analysis.best_choice} | cached=${result.cached}`);
        
      } catch (err: any) {
        uiLog(`[ComparisonStore] Comparison failed: ${err.message}`);
        
        set({ 
          error: err.message || "Failed to compare products",
          isLoading: false 
        });
      }
    },

    clearComparison: () => {
      uiLog(`[ComparisonStore] Clearing comparison result`);
      set({ 
        result: null, 
        error: null,
        isLoading: false 
      });
    },

    setResult: (result) => {
      set({ result });
    },
  })
);
/* =========================
   EMAIL COLLECTION STORE
========================= */

interface EmailState {
  email: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  lastAttempt: number | null;
  
  setEmail: (email: string) => void;
  setStatus: (status: EmailState['status']) => void;
  setMessage: (message: string) => void;
  reset: () => void;
}

export const useEmailStore = create<EmailState>()(
  (set) => ({
    email: '',
    status: 'idle',
    message: '',
    lastAttempt: null,

    setEmail: (email) => set({ email }),
    
    setStatus: (status) => set({ status }),
    
    setMessage: (message) => set({ message }),
    
    reset: () => set({
      email: '',
      status: 'idle',
      message: '',
      lastAttempt: null
    })
  })
);


/* =========================
   SYSTEM STORE
========================= */
interface SystemState {
  systemVersion: number; // only one field
  setSystemVersion: (v: number) => void;
  checkSystemVersion: (backendVersion: number) => boolean;
}

export const useSystemStore = create<SystemState>()(
  persist(
    (set, get) => ({
      systemVersion: 0, // default to 0

      setSystemVersion: (v: number) => {
        const current = get().systemVersion;
        if (current === v) {
          uiLog(`[SYSTEM_STORE] Version unchanged (${v})`);
          return;
        }
        uiLog(`[SYSTEM_STORE] Updating system version from ${current} → ${v}`);
        set({ systemVersion: v });
      },

      checkSystemVersion: (backendVersion: number) => {
        const current = get().systemVersion;
        uiLog(`[SYSTEM_STORE] current version ${current}`)
        if (backendVersion > current) {
          uiLog(`[SYSTEM_STORE] Backend version ${backendVersion} > frontend ${current}, updating`);
          set({ systemVersion: backendVersion });
          return true
        }else{
          return false 
        }
      },
    }),
    {
      name: "system-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ systemVersion: state.systemVersion }),
      onRehydrateStorage: () => (state, error) => {
        if (error) uiLog(`[SYSTEM_STORE] Failed to hydrate, ${error}`);
        else uiLog(`[SYSTEM_STORE] Hydrated systemVersion: ${state?.systemVersion}`);
      },
    }
  )
);

interface LastQueryState {
  lastQuery: string | null;
  lastQueryLang: string;
  lastPage: number;  
  setLastQuery: (query: string, lang?: string, page?: number) => void;
  clearLastQuery: () => void;
}

export const useLastQueryStore = create<LastQueryState>()(
  persist(
    (set) => ({
      lastQuery: null,
      lastQueryLang: "en",
      lastPage: 1,
      setLastQuery: (query, lang = "en", page = 1) => 
        set({ lastQuery: query, lastQueryLang: lang, lastPage: page }),
      clearLastQuery: () => set({ lastQuery: null, lastQueryLang: "en", lastPage: 1 }),
    }),
    {
      name: "last-query-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);





export type NotificationType = "error" | "success" | "info" | "warning";

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; // <-- add this
}



interface NotificationState {
  notifications: NotificationItem[];
  disabled: boolean;
  setDisabled: (value: boolean) => void;
  addNotification: (notification: Omit<NotificationItem, "id">) => void;
  removeNotification: (id: string) => void;
}

// Persisted notification store
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      disabled: false,
      setDisabled: (value) => set({ disabled: value }),

      addNotification: (notification) => {
        // Respect disabled flag
        if (get().disabled) return;

        set((state) => ({
          notifications: [
            ...state.notifications,
            { id: uuidv4(), ...notification },
          ],
        }));
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
    }),
    {
      name: "notifications-store",
      storage: createJSONStorage(() => localStorage),
      // optional: only persist the disabled flag if you want
      partialize: (state) => ({ disabled: state.disabled }),
    }
  )
);


type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  effectiveMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => {
      let mediaQuery: MediaQueryList | null = null;
      let systemListener: ((e: MediaQueryListEvent) => void) | null = null;

      const applyThemeClass = (mode: "light" | "dark") => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(mode);
      };

      const getSystemMode = (): "light" | "dark" =>
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

      return {
        mode: "system",
        effectiveMode: getSystemMode(),

        setMode: (mode) => {
          // Remove previous system listener if it exists
          if (mediaQuery && systemListener) {
            mediaQuery.removeEventListener("change", systemListener);
            systemListener = null;
          }

          let effectiveMode: "light" | "dark";

          if (mode === "system") {
            mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            effectiveMode = getSystemMode();

            systemListener = (e: MediaQueryListEvent) => {
              const newMode = e.matches ? "dark" : "light";
              set({ effectiveMode: newMode });
              applyThemeClass(newMode);
            };

            mediaQuery.addEventListener("change", systemListener);
          } else {
            effectiveMode = mode;
          }

          set({ mode, effectiveMode });
          applyThemeClass(effectiveMode);
        },

        toggleMode: () => {
          const modes: ThemeMode[] = ["light", "dark", "system"];
          const currentIndex = modes.indexOf(get().mode);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          get().setMode(nextMode);
        },
      };
    },
    {
      name: "theme",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setMode(state.mode);
      },
    }
  )
);

interface CookieState {
  consent: boolean | null;
  accept: () => void;
  decline: () => void;
}

export const useCookieStore = create<CookieState>()(
  persist(
    (set) => ({
      consent: null,
      accept: () => set({ consent: true }),
      decline: () => set({ consent: false }),
    }),
    {
      name: "cookie-consent", // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);



/* =========================
   CONSTANTS
========================= */

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours (was 3h)
const OFFERS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (was 30m)

/* =========================
   TYPES
========================= */

interface CookieState {
  consent: boolean | null;
  accept: () => void;
  decline: () => void;
}

interface MultiQueryEntry {
  pageCache: Record<number, AggregatedProduct[]>;
  totalResults: number;
  updatedAt: number;
}

interface ProductOffersEntry {
  offers: AggregatedProduct["offers"];
  fetchedAt: number;
  isError?: boolean;
  errorType?: "429" | "network" | "generic";
}

interface State {
  //
  drawerOpen: boolean;
  settingsOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  toggleSettings: () => void;


  rightDrawerOpen: boolean;
  setRightDrawerOpen: (open: boolean) => void;




  syncTriggered: number;
  triggerSync: () => void;
  //
  debugShowSessionExpired: boolean;
  setDebugShowSessionExpired: (show: boolean) => void;
  // Add to your store (inside create)
   globalInvalidationTimestamp: number; // When backend last resynced
  setGlobalInvalidationTimestamp: (timestamp: number) => void;
  /* ================= INDEXED DB SYNC ================= */
  isSyncingFromIndexedDb: boolean;
  lastSyncTimestamp: number;
  setSyncingFromIndexedDb: (value: boolean) => void;
  setLastSyncTimestamp: (timestamp: number) => void;
  /*fresh result*/
  hasFreshResults: boolean;
  /* offline */
  isOffline: boolean;
  setOffline: (value: boolean) => void;
  /* autocomplete */
  autocompleteResetToken: number;
  triggerAutocompleteReset: () => void;
  /* Search */
  query: string;
  setQuery: (q: string) => void;
  aggregatedProducts: AggregatedProduct[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  itemsPerPage: number;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  searchProducts: (query?: string, lang?: string, page?: number, hydrating?: boolean) => Promise<void>;
  /* Cache */
  multiQueryCache: Record<string, MultiQueryEntry>;
  queryCacheKey: string;
  clearCache: () => void;
  /* Offers */
  selectedProductId: string | null;
  productOffers: Record<string, ProductOffersEntry>;
  isOffersLoading: boolean;
  openProduct: (productId: string) => Promise<void>;
  closeProduct: () => void;
  /* Selected offers */
  selectedOffers: Record<string, AggregatedProduct["offers"][number]>;
  addSelectedOffer: (offer: AggregatedProduct["offers"][number]) => void;
  removeSelectedOffer: (offerId: string) => void;
  clearSelectedOffers: () => void;
  /* Sorting */
  offersSortColumn: "price" | "shop" | null;
  offersSortAscending: boolean;
  setOffersSort: (column: "price" | "shop") => void;
  /* ================= SESSION ================= */
  isSessionExpired: boolean;
  openSessionExpired: () => void;
  closeSessionExpired: () => void;
  resetSessionData: () => void;
}

/* =========================
   STORE
========================= */
export const useStore = create<State>()(
  persist(
    (set, get) => ({

      rightDrawerOpen: false,
      setRightDrawerOpen: (open) => set({ rightDrawerOpen: open }),

      drawerOpen: false,
      settingsOpen: false,
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      toggleSettings: () => set((state) => ({ 
        settingsOpen: !state.settingsOpen 
      })),

      syncTriggered: 0,
      triggerSync: () => set((state) => ({ syncTriggered: state.syncTriggered + 1 })),
      //
      debugShowSessionExpired: false,
      setDebugShowSessionExpired: (show) => set({ debugShowSessionExpired: show }),
      //global timestamp 
      globalInvalidationTimestamp: 0,
      setGlobalInvalidationTimestamp: (timestamp) => 
        set({ globalInvalidationTimestamp: timestamp }),
      // index db
      isSyncingFromIndexedDb: false,
      lastSyncTimestamp: 0,
      setSyncingFromIndexedDb: (value) => set({ isSyncingFromIndexedDb: value }),
      setLastSyncTimestamp: (timestamp) => set({ lastSyncTimestamp: timestamp }),
      isOffline: !navigator.onLine, // initial state based on navigator
      setOffline: (value) => set({ isOffline: value }),
      /* ================= SEARCH ================= */
      query: useLastQueryStore.getState().lastQuery || "",
      setQuery: (q) => set({ query: q }),
      aggregatedProducts: [],
      currentPage: 1,
      totalPages: 0,
      totalResults: 0,
      itemsPerPage: 20,
      hasFreshResults: false,
      isLoading: false,
      setIsLoading: (v) => set({ isLoading: v }),
      searchProducts: async (query, lang, page = 1, hydrating = false) => {
        const searchService = new SearchProductsService(get, set);
        return searchService.execute(query, lang, page, hydrating);
      },
      /* ================= CACHE ================= */
      multiQueryCache: {},
      queryCacheKey: "",
      clearCache: () => {
        set({
          multiQueryCache: {},
          aggregatedProducts: [],
          currentPage: 1,
          totalPages: 0,
          totalResults: 0,
        })
        // Clear IndexedDB in background
        indexedDbService.clearAll().catch(console.error);
        uiLog("Cache cleared from both Zustand and IndexedDB");
      },
      /* ================= OFFERS ================= */
      selectedProductId: null,
      productOffers: {},
      isOffersLoading: false,
      openProduct: async (productId) => {
        const openProductService = new OpenProductService(get, set);
        return openProductService.execute(productId);
      },
      closeProduct: () => set({ selectedProductId: null }),
      /* ================= SELECTED OFFERS ================= */
      selectedOffers: {},
      addSelectedOffer: (offer) =>
        set((s) => ({
          selectedOffers: { ...s.selectedOffers, [offer.id]: offer },
        })),
      removeSelectedOffer: (id) =>
        set((s) => {
          const copy = { ...s.selectedOffers };
          delete copy[id];
          return { selectedOffers: copy };
        }),
      clearSelectedOffers: () => set({ selectedOffers: {} }),
      isSessionExpired: false,
      openSessionExpired: () => set({ isSessionExpired: true }),
      closeSessionExpired: () => set({ isSessionExpired: false }),
      resetSessionData: async () => {
        set({
          // search / cache
          multiQueryCache: {},
          aggregatedProducts: [],
          currentPage: 1,
          totalPages: 0,
          totalResults: 0,
          queryCacheKey: "",
          query: "",
          // offers
          selectedProductId: null,
          productOffers: {},
          isOffersLoading: false,
          // selected offers
          selectedOffers: {},
        });
        // Also wipe persisted sessionStorage
        sessionStorage.removeItem("pricecomp-store");
        // DON'T clear IndexedDB here anymore - we do it in the sync service
        uiLog("Session data cleared from Zustand, sessionStorage");
      },
      autocompleteResetToken: 0,
      triggerAutocompleteReset: () =>
        set((s) => ({
          autocompleteResetToken: s.autocompleteResetToken + 1,
        })),

      /* ================= SORT ================= */
      offersSortColumn: "price",
      offersSortAscending: true,
      setOffersSort: (column) =>
        set((s) => ({
          offersSortColumn: column,
          offersSortAscending:
            s.offersSortColumn === column
              ? !s.offersSortAscending
              : true,
        })),
    }),
    {
      name: "pricecomp-store",
      storage: createJSONStorage(() => sessionStorage),

      partialize: (state) => ({
        multiQueryCache: state.multiQueryCache,
        productOffers: state.productOffers,
        selectedOffers: state.selectedOffers,
        itemsPerPage: state.itemsPerPage,
        queryCacheKey: state.queryCacheKey,
      }),
    }
  )
);


// ============= INDEXED DB SYNC HELPERS =============


/* =========================
   HELPERS
========================= */
const generateCacheKey = (query: string, lang?: string) =>
  `${query}-${lang || "en"}`;
const isExpired = (ts: number) => Date.now() - ts > CACHE_MAX_AGE;
let freshResultsTimeout: ReturnType<typeof setTimeout> | null = null;


const syncCacheToIndexedDb = async (state: State) => {
  try {
    if (state.isOffline) return;
    
    // Sync product caches - with validation
    const cacheEntries = Object.entries(state.multiQueryCache);
    for (const [cacheKey, entry] of cacheEntries) {
      if (!entry.pageCache || Object.keys(entry.pageCache).length === 0) continue;
      if (isExpired(entry.updatedAt)) continue;
      
      // Clean the products before saving to IndexedDB
      const cleanPageCache: Record<number, AggregatedProduct[]> = {};
      
      Object.entries(entry.pageCache).forEach(([pageNum, products]) => {
        // Ensure each product has offers as empty array but PRESERVE offers_count
        cleanPageCache[Number(pageNum)] = products.map(p => ({
          ...p,
          offers: [], // Force offers to be empty array in search cache
          // offers_count is already preserved from the original data
        }));
      });
      
      // Get first page for the products field (required by IndexedDB)
      const firstPage = Object.keys(cleanPageCache)[0];
      const firstPageProducts = firstPage ? cleanPageCache[Number(firstPage)] : [];
      
      if (firstPageProducts.length > 0) {
        await indexedDbService.saveProducts(
          cacheKey,
          firstPageProducts,
          parseInt(firstPage),
          entry.totalResults,
          cleanPageCache // Save the complete clean cache
        );
      }
    }
    
    // Sync offers - these are separate and should have full offers
    const offerEntries = Object.entries(state.productOffers);
    for (const [productId, offerEntry] of offerEntries) {
      // ONLY cache valid offers entries
      if (!offerEntry.offers || 
          offerEntry.offers.length === 0 || 
          offerEntry.isError ||
          offerEntry.fetchedAt === 0 ||
          Date.now() - offerEntry.fetchedAt > OFFERS_CACHE_TTL) {
        continue;
      }
      
      await indexedDbService.saveOffers(productId, offerEntry.offers);
    }
    
    state.setLastSyncTimestamp(Date.now());
    
  } catch (error) {
    uiLog(`Failed to sync cache to IndexedDB: ${error}`);
  }
};



/* =========================
   SEARCH PRODUCTS SERVICE
========================= */

class SearchProductsService {
  private get: () => State;
  private set: (partial: State | Partial<State> | ((state: State) => Partial<State>)) => void;

  constructor(get: () => State, set: (partial: State | Partial<State> | ((state: State) => Partial<State>)) => void) {
    this.get = get;
    this.set = set;
  }

  async execute(query?: string, lang?: string, page = 1, hydrating = false): Promise<void> {
    if (query) {
      this.set({ query: query });
    }
    uiLog(`Search products=${query}`);

    this.clearFreshResultsTimeout();

    const q = query ?? this.get().query;
    if (!q) return;

    const cacheKey = generateCacheKey(q, lang);
    const { itemsPerPage } = this.get();
    const addNotification = useNotificationStore.getState().addNotification;

    // STEP 1: Check Zustand memory cache
    if (await this.tryZustandCache(q, lang, page, cacheKey)) {
      return;
    }

    // STEP 2: Check IndexedDB
    if (await this.tryIndexedDbCache(q, lang, page, cacheKey)) {
      return;
    }

    // STEP 3: Fetch from API
    await this.fetchFromApi(q, lang, page, hydrating, cacheKey, itemsPerPage, addNotification);
  }

  private clearFreshResultsTimeout(): void {
    if (freshResultsTimeout) {
      clearTimeout(freshResultsTimeout);
      freshResultsTimeout = null;
    }
  }

  private async tryZustandCache(q: string, lang: string | undefined, page: number, cacheKey: string): Promise<boolean> {
    const { multiQueryCache, itemsPerPage, syncTriggered } = this.get();
    const cached = multiQueryCache[cacheKey];

    // If sync was triggered and we have cached data, reload from IndexedDB
    if (syncTriggered > 0 && cached) {
      this.set({ syncTriggered: 0 });
      return false; // Continue to IndexedDB
    }

    if (cached && !isExpired(cached.updatedAt)) {
      useLastQueryStore.getState().setLastQuery(q, lang || "en", page);
      const pageData = cached.pageCache[page];

      if (pageData && Array.isArray(pageData) && pageData.length > 0) {
        this.triggerPrefetchFromPageData(pageData, q);
        
        this.set({
          aggregatedProducts: pageData,
          currentPage: page,
          totalResults: cached.totalResults,
          totalPages: Math.ceil(cached.totalResults / itemsPerPage),
        });
        return true;
      }
    }

    return false;
  }

  private triggerPrefetchFromPageData(pageData: AggregatedProduct[], query: string): void {
    if (!this.get().isOffline) {
      const productIds = pageData
        .map((p: any) => p?.id)
        .filter(Boolean);

      if (productIds.length > 0) {
        uiLog("[Store] Triggering prefetch from memory cache hydrate");
        prefetchService.addToQueue(productIds, query);
      }
    }
  }

  private async tryIndexedDbCache(_q: string, _lang: string | undefined, page: number, cacheKey: string): Promise<boolean> {
    try {
      const { itemsPerPage } = this.get();
      const indexedDbCache = await indexedDbService.getProducts(cacheKey);
      
      if (indexedDbCache && !isExpired(indexedDbCache.updatedAt)) {
        // VALIDATE AND FIX: Check for corrupted data (offers as number)
        const fixedPageCache: Record<number, AggregatedProduct[]> = {};
        
        Object.entries(indexedDbCache.pageCache).forEach(([pageNum, products]) => {
          fixedPageCache[Number(pageNum)] = products.map(validateAndFixCachedProduct);
        });
        
        const pageData = fixedPageCache[page];
        if (pageData && pageData.length > 0) {
          const [q, lang] = cacheKey.split("-");
          useLastQueryStore.getState().setLastQuery(q, lang || "en", page);

          // TRIGGER PREFETCH HERE!
          this.triggerPrefetchFromIndexedDb(pageData, q);

          // Restore to Zustand memory cache with FIXED data
          this.restoreFromIndexedDb(pageData, page, indexedDbCache, fixedPageCache, cacheKey, itemsPerPage);

          return true;
        }
      }
    } catch (error) {
      uiLog(`Failed to read from IndexedDB: ${error}`);
    }

    return false;
  }

  private triggerPrefetchFromIndexedDb(pageData: AggregatedProduct[], query: string): void {
    const productIds = pageData.map(p => p.id).filter(Boolean);
    if (productIds.length > 0 && !this.get().isOffline) {
      uiLog(`[Store] Triggering prefetch for ${productIds.length} products from IndexedDB cache`);
      prefetchService.addToQueue(productIds, query);
    }
  }

  private restoreFromIndexedDb(
    pageData: AggregatedProduct[],
    page: number,
    indexedDbCache: any,
    fixedPageCache: Record<number, AggregatedProduct[]>,
    cacheKey: string,
    itemsPerPage: number
  ): void {
    this.set((s: State) => ({
      aggregatedProducts: pageData,
      currentPage: page,
      totalResults: indexedDbCache.totalResults,
      totalPages: Math.ceil(indexedDbCache.totalResults / itemsPerPage),
      multiQueryCache: {
        ...s.multiQueryCache,
        [cacheKey]: {
          pageCache: fixedPageCache,
          totalResults: indexedDbCache.totalResults,
          updatedAt: indexedDbCache.updatedAt,
        },
      },
      queryCacheKey: cacheKey,
      hasFreshResults: true
    }));

    freshResultsTimeout = setTimeout(() => {
      this.set({ hasFreshResults: false });
      freshResultsTimeout = null;
    }, 1000);
  }

  private async fetchFromApi(
    q: string,
    lang: string | undefined,
    page: number,
    hydrating: boolean,
    cacheKey: string,
    itemsPerPage: number,
    addNotification: any
  ): Promise<void> {
    if (hydrating) { 
      this.set({ isLoading: false });
    } else {
      this.set({ isLoading: true });
    }
    
    const cursor = page > 1 ? ((page - 1) * itemsPerPage).toString() : undefined;

    try {
      const data = await apiSearchProducts(q, lang, itemsPerPage, cursor);
      
      const transformedProducts = data.products.map(transformSearchResult);

      this.triggerPrefetchFromApi(transformedProducts, q);
      this.prefetchNextPages(data, q, lang, page, itemsPerPage);

      // Only update lastQuery on SUCCESSFUL API response
      useLastQueryStore.getState().setLastQuery(q, lang || "en", page);
      
      await this.updateStateAfterApiFetch(cacheKey, page, transformedProducts, data, itemsPerPage);

    } catch (err: any) {
      this.handleApiError(err, addNotification);
    } finally {
      this.set({ isLoading: false });
    }
  }

  private triggerPrefetchFromApi(transformedProducts: AggregatedProduct[], query: string): void {
    const productIds = transformedProducts
      .map(p => p.id)
      .filter(Boolean);
    
    if (productIds.length > 0 && !this.get().isOffline) {
      prefetchService.addToQueue(productIds, query);
    }
  }

  private prefetchNextPages(data: any, q: string, lang: string | undefined, page: number, itemsPerPage: number): void {
    if (data.total_count > page * itemsPerPage && !this.get().isOffline) {
      const totalPages = Math.ceil(data.total_count / itemsPerPage);
      const remainingPages = totalPages - page;
      const pagesToPrefetch = Math.min(2, remainingPages);
      
      if (pagesToPrefetch > 0) {
        prefetchService.prefetchNextPages(
          q, 
          lang || 'en', 
          page, 
          itemsPerPage, 
          pagesToPrefetch
        );
      }
    }
  }

  private async updateStateAfterApiFetch(
    cacheKey: string,
    page: number,
    transformedProducts: AggregatedProduct[],
    data: any,
    itemsPerPage: number
  ): Promise<void> {
    const cached = this.get().multiQueryCache[cacheKey];

    this.set((s: State) => {
      const updatedPageCache: Record<number, AggregatedProduct[]> = {
        ...(cached?.pageCache ?? {}),
        [page]: transformedProducts,
      };

      const updatedMultiQueryCache: Record<string, MultiQueryEntry> = {
        ...s.multiQueryCache,
        [cacheKey]: {
          pageCache: updatedPageCache,
          totalResults: data.total_count,
          updatedAt: Date.now(),
        },
      };

      const newState: Partial<State> = {
        aggregatedProducts: transformedProducts,
        currentPage: page,
        totalResults: data.total_count,
        totalPages: Math.ceil(data.total_count / itemsPerPage),
        multiQueryCache: updatedMultiQueryCache,
        queryCacheKey: cacheKey,
        isLoading: false,
        hasFreshResults: true,
      };

      // Save to IndexedDB in background
      const updatedState = { ...s, ...newState };
      syncCacheToIndexedDb(updatedState as State).catch(console.error);

      return newState;
    });

    freshResultsTimeout = setTimeout(() => {
      this.set({ hasFreshResults: false });
      freshResultsTimeout = null;
    }, 1000);
  }

  private handleApiError(err: any, addNotification: any): void {
    if (err?.code === 403 || err?.message === "SESSION_EXPIRED") {
      this.get().openSessionExpired();
      return;
    }
    
    if (err?.message === "TOO_MANY_REQUESTS" || err?.response?.status === 429) {
      addNotification({
        message: i18n.t("Error_429"),
        type: "warning",
        duration: 5000,
      });
      return;
    }
    
    if (err?.response?.status === 404) {
      addNotification({
        message: i18n.t("Error_404"),
        type: "error",
        duration: 4000,
      });
      return;
    }

    if (!err.response || err.code === "ERR_NETWORK" || err.message === "Network Error") {
      return;
    }
    
    addNotification({
      message: i18n.t("Error_Generic"),
      type: "error",
      duration: 5000,
    });
    throw err;
  }
}



/* =========================
   OPEN PRODUCT SERVICE
========================= */

class OpenProductService {
  private get: () => State;
  private set: (partial: State | Partial<State> | ((state: State) => Partial<State>)) => void;

  constructor(
    get: () => State, 
    set: (partial: State | Partial<State> | ((state: State) => Partial<State>)) => void
  ) {
    this.get = get;
    this.set = set;
  }

  async execute(productId: string): Promise<void> {
    const cached = this.get().productOffers[productId];
    prefetchService.removeFromQueue([productId]);

    this.logStart(productId);
    
    // Find the product in aggregatedProducts to get offers_count from Layer 1
    const product = this.findProductInAggregated(productId);
    const expectedOffersCount = product?.offers_count;
    
    this.logLayer1Data(productId, product);

    // ============= STEP 1: Check Zustand memory cache =============
    if (await this.tryZustandCache(productId, cached, expectedOffersCount)) {
      return;
    }

    // ============= STEP 2: Check IndexedDB =============
    if (await this.tryIndexedDbCache(productId, expectedOffersCount)) {
      return;
    }

    // ============= STEP 3: Fetch from API =============
    await this.fetchFromApi(productId, expectedOffersCount, product);
    
    this.logEnd(productId);
  }

  private logStart(productId: string): void {
    uiLog(`[openProduct] ========== START for productId=${productId} ==========`);
  }

  private logEnd(productId: string): void {
    uiLog(`[openProduct] ========== END for productId=${productId} ==========`);
  }

  private findProductInAggregated(productId: string): AggregatedProduct | undefined {
    return this.get().aggregatedProducts.find(p => p.id === productId);
  }

  private logLayer1Data(productId: string, product: AggregatedProduct | undefined): void {
    uiLog(`[openProduct] 🔍 LAYER 1 DATA: productId=${productId}, found=${!!product}`);
    if (product) {
      uiLog(`[openProduct] 📊 LAYER 1: name="${product.name}", offers_count=${product.offers_count}, lowest_price=${product.lowest_price}`);
    } else {
      uiLog(`[openProduct] ⚠️ WARNING: Product ${productId} not found in aggregatedProducts!`);
    }
  }

  private async tryZustandCache(
    productId: string, 
    cached: ProductOffersEntry | undefined, 
    expectedOffersCount: number | undefined
  ): Promise<boolean> {
    if (!cached) {
      uiLog(`[openProduct] 📦 STEP 1: No Zustand cache found for ${productId}`);
      return false;
    }

    uiLog(`[openProduct] 📦 STEP 1: Zustand cache check for ${productId}`);
    uiLog(`[openProduct] 📦 Zustand cache: offers.length=${cached.offers.length}, fetchedAt=${new Date(cached.fetchedAt).toISOString()}, age=${Math.round((Date.now() - cached.fetchedAt)/1000)}s, isError=${cached.isError}`);
    
    if (cached.offers.length > 0 && Date.now() - cached.fetchedAt < OFFERS_CACHE_TTL) {
      uiLog(`[openProduct] 📦 STEP 1: Using cached offers from Zustand for ${productId}`);
      
      // VALIDATE: Check if cached offers count matches expected from Layer 1
      if (!this.validateOffersCount(productId, cached.offers.length, expectedOffersCount, "Zustand")) {
        // Invalidate cache and continue to fetch fresh
        this.invalidateZustandCache(productId);
        return false;
      }
      
      if (!expectedOffersCount || cached.offers.length === expectedOffersCount) {
        this.setSelectedProductId(productId);
        uiLog(`[openProduct] ✅ STEP 1: Returning with ${cached.offers.length} cached offers`);
        return true;
      }
    } else {
      if (cached.offers.length === 0) {
        uiLog(`[openProduct] 📦 STEP 1: Zustand cache has empty offers array`);
      }
      if (Date.now() - cached.fetchedAt >= OFFERS_CACHE_TTL) {
        uiLog(`[openProduct] 📦 STEP 1: Zustand cache expired (age=${Math.round((Date.now() - cached.fetchedAt)/1000)}s > ${OFFERS_CACHE_TTL/1000}s)`);
      }
    }

    return false;
  }

  private invalidateZustandCache(productId: string): void {
    this.set((s) => {
      const newProductOffers = { ...s.productOffers };
      delete newProductOffers[productId];
      return { productOffers: newProductOffers };
    });
  }

  private async tryIndexedDbCache(productId: string, expectedOffersCount: number | undefined): Promise<boolean> {
    try {
      uiLog(`[openProduct] 💾 STEP 2: Checking IndexedDB for ${productId}`);
      const indexedDbOffers = await indexedDbService.getOffers(productId);
      
      this.logIndexedDbResponse(productId, indexedDbOffers);

      if (indexedDbOffers && indexedDbOffers.offers.length > 0 && Date.now() - indexedDbOffers.fetchedAt < OFFERS_CACHE_TTL) {
        uiLog(`[openProduct] 💾 STEP 2: Restoring offers from IndexedDB for ${productId}`);
        
        // VALIDATE: Check if IndexedDB offers count matches expected from Layer 1
        if (!this.validateOffersCount(productId, indexedDbOffers.offers.length, expectedOffersCount, "IndexedDB")) {
          // Clear corrupted data and continue to fetch
          await indexedDbService.saveOffers(productId, []);
          return false;
        }
        
        if (!expectedOffersCount || indexedDbOffers.offers.length === expectedOffersCount) {
          await this.restoreFromIndexedDb(productId, indexedDbOffers);
          return true;
        }
      } else if (indexedDbOffers && indexedDbOffers.offers.length === 0) {
        uiLog(`[openProduct] 💾 STEP 2: IndexedDB has empty offers array`);
      } else if (indexedDbOffers && Date.now() - indexedDbOffers.fetchedAt >= OFFERS_CACHE_TTL) {
        uiLog(`[openProduct] 💾 STEP 2: IndexedDB cache expired (age=${Math.round((Date.now() - indexedDbOffers.fetchedAt)/1000)}s)`);
      }
    } catch (error) {
      uiLog(`[openProduct] 💾 STEP 2: Failed to read offers from IndexedDB: ${error}`);
    }

    return false;
  }

  private logIndexedDbResponse(_productId: string, indexedDbOffers: any): void {
    uiLog(`[openProduct] 💾 IndexedDB response: ${indexedDbOffers ? 'found' : 'not found'}`);
    if (indexedDbOffers) {
      uiLog(`[openProduct] 💾 IndexedDB offers: count=${indexedDbOffers.offers.length}, fetchedAt=${new Date(indexedDbOffers.fetchedAt).toISOString()}, age=${Math.round((Date.now() - indexedDbOffers.fetchedAt)/1000)}s`);
      
      // Log first few offer IDs if any
      if (indexedDbOffers.offers.length > 0) {
        uiLog(`[openProduct] 💾 IndexedDB first 3 offer IDs: ${indexedDbOffers.offers.slice(0, 3).map((o: any) => o.id).join(', ')}`);
      }
    }
  }

  private async restoreFromIndexedDb(productId: string, indexedDbOffers: any): Promise<void> {
    this.set((s) => ({
      productOffers: {
        ...s.productOffers,
        [productId]: {
          offers: indexedDbOffers.offers,
          fetchedAt: indexedDbOffers.fetchedAt,
          isError: false,
        },
      },
      selectedProductId: productId,
    }));
    uiLog(`[openProduct] ✅ STEP 2: Restored ${indexedDbOffers.offers.length} offers from IndexedDB`);
  }

  private validateOffersCount(
    _productId: string, 
    actualCount: number, 
    expectedCount: number | undefined, 
    source: string
  ): boolean {
    if (expectedCount === undefined) {
      uiLog(`[openProduct] ⚠️ Cannot validate ${source} vs Layer 1 - product not found in aggregatedProducts`);
      return true; // Can't validate, assume it's valid
    }

    if (actualCount === expectedCount) {
      uiLog(`[openProduct] ✅ VALIDATION PASSED: ${source} offers count (${actualCount}) matches Layer 1 expected (${expectedCount})`);
      return true;
    } else {
      uiLog(`[openProduct] ❌ VALIDATION FAILED: ${source} offers count (${actualCount}) DOES NOT MATCH Layer 1 expected (${expectedCount})`);
      uiLog(`[openProduct] ⚠️ Cache corruption detected! Invalidating and fetching fresh...`);
      return false;
    }
  }

  private setSelectedProductId(productId: string): void {
    this.set({ selectedProductId: productId });
  }

  private async fetchFromApi(
    productId: string, 
    expectedOffersCount: number | undefined,
    product: AggregatedProduct | undefined
  ): Promise<void> {
    uiLog(`[openProduct] 🌐 STEP 3: Fetching offers from API for ${productId}`);
    this.set({ isOffersLoading: true, selectedProductId: productId });

    try {
      const data = await apiGetProductOffers(productId, true, this.get().query);

      this.logApiResponse(productId, data);

      // Defensive check
      if (!data.offers) {
        this.handleEmptyOffersResponse(productId);
        return;
      }

      const actualOffersCount = data.offers.length;
      this.logApiOffersDetails(productId, data, actualOffersCount);

      // ============= CRITICAL VALIDATION: Layer 1 vs Layer 2 =============
      this.validateLayerConsistency(productId, expectedOffersCount, actualOffersCount, product);

      // Check if offers count exceeds max (should never happen with backend fix)
      /* if (actualOffersCount > 50) {
        uiLog(`[openProduct] 🔴 ERROR: API returned ${actualOffersCount} offers which exceeds max 50!`);
      } */

      uiLog(`[openProduct] 💾 STEP 3: Updating state with ${actualOffersCount} offers`);

      await this.updateStateWithApiResponse(productId, data);

      uiLog(`[openProduct] ✅ STEP 3: Successfully fetched and stored ${actualOffersCount} offers`);

    } catch (err: any) {
      await this.handleApiError(productId, err);
    } finally {
      this.set({ isOffersLoading: false });
    }
  }

  private logApiResponse(productId: string, data: any): void {
    uiLog(`[openProduct] 🌐 API response received for ${productId}`);
    uiLog(`[openProduct] 🌐 API response: offers_count=${data.offers?.length || 0}, has_more=${data.has_more}, next_cursor=${data.next_cursor}`);
  }

  private logApiOffersDetails(productId: string, data: any, actualOffersCount: number): void {
    uiLog(`[openProduct] 🌐 API returned ${actualOffersCount} offers for ${productId}`);
    
    // Log first few offer IDs for debugging
    if (actualOffersCount > 0) {
      uiLog(`[openProduct] 🌐 First 3 offer IDs: ${data.offers.slice(0, 3).map((o: any) => o.id).join(', ')}`);
      uiLog(`[openProduct] 🌐 First offer sample: shop=${data.offers[0].shop}, price=${data.offers[0].price}`);
    }
  }

  private validateLayerConsistency(
    productId: string, 
    expectedCount: number | undefined, 
    actualCount: number, 
    product: AggregatedProduct | undefined
  ): void {
    if (expectedCount !== undefined) {
      if (actualCount === expectedCount) {
        uiLog(`[openProduct] ✅✅✅ LAYER MATCH: Layer 1 count (${expectedCount}) === Layer 2 count (${actualCount})`);
      } else {
        uiLog(`[openProduct] ❌❌❌ LAYER MISMATCH: Layer 1 count (${expectedCount}) !== Layer 2 count (${actualCount})`);
        uiLog(`[openProduct] 🔴 CRITICAL: Backend cache inconsistency detected!`);
        uiLog(`[openProduct] 📝 Product: ${productId}, Expected: ${expectedCount}, Actual: ${actualCount}`);
        
        // Log the full product for debugging
        if (product) {
          uiLog(`[openProduct] 📝 Product details: name="${product.name}", lowest_price=${product.lowest_price}`);
        }
        
        // If expected is 0 but we got offers, that's a big problem
        if (expectedCount === 0 && actualCount > 0) {
          uiLog(`[openProduct] 🔴 ERROR: Expected 0 offers but got ${actualCount} - product should not have offers!`);
        }
        
        // If expected > 0 but got 0, that's also a problem
        if (expectedCount > 0 && actualCount === 0) {
          uiLog(`[openProduct] 🔴 ERROR: Expected ${expectedCount} offers but got 0 - offers missing from cache!`);
        }
        
        // If we got more than expected (should never happen with backend fix)
        if (actualCount > expectedCount) {
          uiLog(`[openProduct] 🔴 ERROR: Got ${actualCount} offers, expected only ${expectedCount} - cache contains extra offers!`);
        }
        
        // If we got less than expected (pagination might be needed)
        if (actualCount < expectedCount) {
          uiLog(`[openProduct] ⚠️ WARNING: Got ${actualCount} offers, expected ${expectedCount} - possible pagination?`);
        }
      }
    } else {
      uiLog(`[openProduct] ⚠️ Cannot validate Layer 1 vs Layer 2 - product not found in aggregatedProducts`);
    }
  }

  private async updateStateWithApiResponse(productId: string, data: any): Promise<void> {
    this.set((s) => {
      const newState = {
        productOffers: {
          ...s.productOffers,
          [productId]: {
            offers: data.offers,
            fetchedAt: Date.now(),
            isError: false,
          },
        },
        isOffersLoading: false,
      };
      
      uiLog(`[openProduct] 💾 Triggering IndexedDB sync`);
      syncCacheToIndexedDb({ ...s, ...newState } as State).catch(console.error);
      
      return newState;
    });
  }

  private handleEmptyOffersResponse(productId: string): void {
    uiLog(`[openProduct] ❌ API returned no offers array for ${productId}`);
    const error = new Error("EMPTY_OFFERS");
    (error as any).code = 404;
    throw error;
  }

  private async handleApiError(productId: string, err: any): Promise<void> {
    uiLog(`[openProduct] ❌ STEP 3: ERROR for ${productId}: ${err?.message} | code=${err?.code} | status=${err?.response?.status}`);

    this.set({ isOffersLoading: false });

    // Error handling with detailed logging
    if (err?.code === 0) {
      this.handleRequestAborted(productId, err);
      return;
    }

    if (err?.code === 404) {
      await this.handleNotFoundError(productId);
      return;
    }
          
    if (err?.code === 403) {
      await this.handleSessionExpiredError(productId);
      return;
    }

    if (err?.code === 429) {
      await this.handleRateLimitError(productId);
      return;
    }

    if (!err.response || err.code === "ERR_NETWORK") {
      await this.handleNetworkError(productId);
      return;
    }
    
    // Generic error
    uiLog(`[openProduct] 🛑 Unhandled error: ${err}`);
  }

  private handleRequestAborted(productId: string, _err: any): void {
    uiLog(`[openProduct] 🛑 Request aborted/cancelled`);
    this.set((s) => ({
      productOffers: {
        ...s.productOffers,
        [productId]: { offers: [], fetchedAt: 0, isError: true, errorType: "generic" },
      },
    }));
    useNotificationStore.getState().addNotification({
      message: i18n.t("Error_0"),
      type: "error",
      duration: 4000,
    });
  }

  private async handleNotFoundError(productId: string): Promise<void> {
    uiLog(`[openProduct] 🛑 404 Not Found - product may be deleted`);
    
    this.set((s) => ({
      productOffers: {
        ...s.productOffers,
        [productId]: { 
          offers: [], 
          fetchedAt: 0, 
          isError: true, 
          errorType: "generic" 
        },
      },
    }));
    
    useNotificationStore.getState().addNotification({
      message: i18n.t("Error_404"),
      type: "error",
      duration: 4000,
    });
  }

  private async handleSessionExpiredError(productId: string): Promise<void> {
    uiLog(`[openProduct] 🛑 403 Session Expired`);
    this.get().openSessionExpired();
    this.set((s) => ({
      productOffers: {
        ...s.productOffers,
        [productId]: { offers: [], fetchedAt: 0, isError: true, errorType: "generic" },
      },
    }));
    useNotificationStore.getState().addNotification({
      message: i18n.t("Error_Generic"),
      type: "error",
      duration: 4000,
    });
  }

  private async handleRateLimitError(productId: string): Promise<void> {
    uiLog(`[openProduct] 🛑 429 Rate Limited`);
    this.set((s) => ({
      productOffers: {
        ...s.productOffers,
        [productId]: { offers: [], fetchedAt: 0, isError: true, errorType: "429" },
      },
    }));
    useNotificationStore.getState().addNotification({
      message: i18n.t("Error_429"),
      type: "warning",
      duration: 4000,
    });
  }

  private async handleNetworkError(productId: string): Promise<void> {
    uiLog(`[openProduct] 🛑 Network Error - offline or connection issue`);
    this.set((s) => ({
      productOffers: {
        ...s.productOffers,
        [productId]: { offers: [], fetchedAt: 0, isError: true, errorType: "network" },
      },
    }));
    useNotificationStore.getState().addNotification({
      message: i18n.t("Error_Network"),
      type: "info",
      duration: 5000,
    });
  }
}