import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uiLog } from "../webhook/client/uiDebug";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { getProductOffers as apiGetProductOffers } from "../api/searchApi";
import { searchProducts as apiSearchProducts } from "../api/searchApi";
import i18n from "../i18n";
import { t } from "i18next";
import { indexedDbService } from "../services/indexedDb";




interface LastQueryState {
  lastQuery: string | null;
  lastQueryLang: string;
  setLastQuery: (query: string, lang?: string) => void;
  clearLastQuery: () => void;
}

export const useLastQueryStore = create<LastQueryState>()(
  persist(
    (set) => ({
      lastQuery: null,
      lastQueryLang: "en",
      setLastQuery: (query, lang = "en") => 
        set({ lastQuery: query, lastQueryLang: lang }),
      clearLastQuery: () => set({ lastQuery: null, lastQueryLang: "en" }),
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
            { id: crypto.randomUUID(), ...notification },
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







type ThemeMode = "light" | "dark";

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


interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "dark", // default mode
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((state) => ({ mode: state.mode === "dark" ? "light" : "dark" })),
    }),
    {
      name: "theme", // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);



/* =========================
   CONSTANTS
========================= */

const CACHE_MAX_AGE = 3 * 60 * 60 * 1000; // 3h
const OFFERS_CACHE_TTL = 30 * 60 * 1000; // 30m

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
  

  // Add to your store (inside create)

 

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

  searchProducts: (query?: string, lang?: string, page?: number) => Promise<void>;

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
   HELPERS
========================= */

const generateCacheKey = (query: string, lang?: string) =>
  `${query}-${lang || "en"}`;
const isExpired = (ts: number) => Date.now() - ts > CACHE_MAX_AGE;
let freshResultsTimeout: ReturnType<typeof setTimeout> | null = null;

/* =========================
   STORE
========================= */

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      // index db
      isSyncingFromIndexedDb: false,
      lastSyncTimestamp: 0,
      setSyncingFromIndexedDb: (value) => set({ isSyncingFromIndexedDb: value }),
      setLastSyncTimestamp: (timestamp) => set({ lastSyncTimestamp: timestamp }),


      isOffline: !navigator.onLine, // initial state based on navigator
      setOffline: (value) => set({ isOffline: value }),

      /* ================= SEARCH ================= */
      query: (() => {
        const { lastQuery } = useLastQueryStore.getState();
        return lastQuery || "";
      })(),
      setQuery: (q) => set({ query: q }),

      aggregatedProducts: [],
      currentPage: 1,
      totalPages: 0,
      totalResults: 0,
      itemsPerPage: 20,
      hasFreshResults: false,
      isLoading: false,
      setIsLoading: (v) => set({ isLoading: v }),

      searchProducts: async (query, lang, page = 1) => {

         // Save current query input value
          if (query) {
            set({ query: query,  });  // ← ONLY update query, NOT lastQuery
          }

        if (freshResultsTimeout) {
          clearTimeout(freshResultsTimeout);
          freshResultsTimeout = null;
        }

        const q = query ?? get().query;

        if (!q) return;


        const cacheKey = generateCacheKey(q, lang);
        const { multiQueryCache, itemsPerPage } = get();
        const addNotification = useNotificationStore.getState().addNotification;

        // ============= STEP 1: Check Zustand memory cache =============
        const cached = multiQueryCache[cacheKey];
        if (cached && !isExpired(cached.updatedAt)) {
          useLastQueryStore.getState().setLastQuery(q, lang || "en");
          const pageData = cached.pageCache[page];
          if (pageData) {
            set({
              aggregatedProducts: pageData,
              currentPage: page,
              totalResults: cached.totalResults,
              totalPages: Math.ceil(cached.totalResults / itemsPerPage),
            });
            return;
          }
        }

        // ============= STEP 2: Check IndexedDB =============
        try {
          const indexedDbCache = await indexedDbService.getProducts(cacheKey);
          
          if (indexedDbCache && !isExpired(indexedDbCache.updatedAt)) {
            const pageData = indexedDbCache.pageCache[page];
            if (pageData && pageData.length > 0) {
                   
                   
                  //always decode q and lang when cached as well as in api call
                  const [q, lang] = cacheKey.split("-")
                  useLastQueryStore.getState().setLastQuery(q, lang || "en");

              // Restore to Zustand memory cache
              set((s) => ({
                aggregatedProducts: pageData,
                currentPage: page,
                totalResults: indexedDbCache.totalResults,
                totalPages: Math.ceil(indexedDbCache.totalResults / itemsPerPage),
                multiQueryCache: {
                  ...s.multiQueryCache,
                  [cacheKey]: {
                    pageCache: indexedDbCache.pageCache,
                    totalResults: indexedDbCache.totalResults,
                    updatedAt: indexedDbCache.updatedAt,
                  },
                },
                queryCacheKey: cacheKey,
                hasFreshResults: true
              }));

              freshResultsTimeout = setTimeout(() => {
                set({ hasFreshResults: false });
                freshResultsTimeout = null;
              }, 1000);

              return;
            }
          }
        } catch (error) {
          uiLog(`Failed to read from IndexedDB: ${error}`);
          // Continue to API call if IndexedDB fails
        }

        // ============= STEP 3: Fetch from API =============
        set({ isLoading: true });

        const cursor = page > 1 ? ((page - 1) * itemsPerPage).toString() : undefined;

        try {
          const data = await apiSearchProducts(q, lang, itemsPerPage, cursor);
          
           //Only update lastQuery on SUCCESSFUL API response
                           
           useLastQueryStore.getState().setLastQuery(q, lang || "en");
          // Update Zustand state
          set((s) => {
            const newState = {
              aggregatedProducts: data.products,
              currentPage: page,
              totalResults: data.total_count,
              totalPages: Math.ceil(data.total_count / itemsPerPage),
              multiQueryCache: {
                ...s.multiQueryCache,
                [cacheKey]: {
                  pageCache: {
                    ...(cached?.pageCache ?? {}),
                    [page]: data.products,
                  },
                  totalResults: data.total_count,
                  updatedAt: Date.now(),
                },
              },
              queryCacheKey: cacheKey,
              isLoading: false,
              hasFreshResults: true
            };

            // ============= STEP 4: Save to IndexedDB in background =============
            // Don't await - let it run in background
            const updatedState = { ...s, ...newState };
            syncCacheToIndexedDb(updatedState as State).catch(console.error);

            return newState;
          });
          freshResultsTimeout = setTimeout(() => {
            set({ hasFreshResults: false });
            freshResultsTimeout = null;
          }, 1000);

        } catch (err: any) {
          set({ isLoading: false });

          if (err?.code === 403 || err?.message === "SESSION_EXPIRED") {
            get().openSessionExpired();
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

          // handle network error
          if (!err.response || err.code === "ERR_NETWORK" || err.message === "Network Error") {
            return;
          }
          // Other errors → notification
          addNotification({
            message: i18n.t("Error_Generic"),
            type: "error",
            duration: 5000,
          });
          throw err;
        }
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
        const cached = get().productOffers[productId];

        // ============= STEP 1: Check Zustand memory cache =============
        if (
          cached &&
          cached.offers.length > 0 &&
          Date.now() - cached.fetchedAt < OFFERS_CACHE_TTL
        ) {
          set({ selectedProductId: productId });
          return;
        }

        // ============= STEP 2: Check IndexedDB =============
        try {
          const indexedDbOffers = await indexedDbService.getOffers(productId);
          
          if (
            indexedDbOffers && 
            indexedDbOffers.offers.length > 0 && 
            Date.now() - indexedDbOffers.fetchedAt < OFFERS_CACHE_TTL
          ) {
            // Restore to Zustand memory cache
            set((s) => ({
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
            return;
          }
        } catch (error) {
          uiLog(`Failed to read offers from IndexedDB: ${error}`);
          // Continue to API call if IndexedDB fails
        }

        // ============= STEP 3: Fetch from API =============
        set({ isOffersLoading: true, selectedProductId: productId });

        try {
          const data = await apiGetProductOffers(productId,true,get().query);

          // Defensive: server SHOULD always return offers
          if (!data.offers || data.offers.length === 0) {
            // treat as error-like state, do NOT cache
            set((s) => ({
              productOffers: {
                ...s.productOffers,
                [productId]: {
                  offers: [],
                  fetchedAt: 0,
                  isError: true,
                  errorType: "generic",
                },
              },
              isOffersLoading: false,
            }));
            return;
          }

          // ============= STEP 4: Update Zustand =============
          set((s) => {
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

            // ============= STEP 5: Save to IndexedDB in background =============
            // Don't await - let it run in background
            const updatedState = { ...s, ...newState };
            syncCacheToIndexedDb(updatedState as State).catch(console.error);

            return newState;
          });

        } catch (err: any) {
          set({ isOffersLoading: false });

          if (err?.code === 403) {
            get().openSessionExpired();
             set((s) => ({
              productOffers: {
                ...s.productOffers,
                [productId]: {
                  offers: [],
                  fetchedAt: 0,
                  isError: true,
                  errorType: "generic",
                },
              },
            }));
               useNotificationStore.getState().addNotification({
              message: i18n.t("Error_Generic"),
              type: "error",
              duration: 4000,
            });
            return;
          }

          if (err?.code === 429) {
            // show EMPTY UI but allow retry
            set((s) => ({
              productOffers: {
                ...s.productOffers,
                [productId]: {
                  offers: [],
                  fetchedAt: 0,
                  isError: true,
                  errorType: "429",
                },
              },
            }));
            useNotificationStore.getState().addNotification({
              message: i18n.t("Error_429"),
              type: "warning",
              duration: 4000,
            });
            return;
          }

          if (!err.response || err.code === "ERR_NETWORK") {
            set((s) => ({
              productOffers: {
                ...s.productOffers,
                [productId]: {
                  offers: [],
                  fetchedAt: 0,
                  isError: true,
                  errorType: "network",
                },
              },
            }));
            useNotificationStore.getState().addNotification({
            message: i18n.t("Error_Network"),
            type: "info",
            duration: 5000,
          });
            return;
          }
          
          
        }
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

        //Missleading naming 
      resetSessionData: () => {
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

        //also wipe persisted sessionStorage
        sessionStorage.removeItem("pricecomp-store");
        //Also clear IndexedDB when session expires
        indexedDbService.clearAll().catch(console.error);
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

const syncCacheToIndexedDb = async (state: State) => {
  try {
    if (state.isOffline) return;
    
    // Sync product caches
    const cacheEntries = Object.entries(state.multiQueryCache);
    for (const [cacheKey, entry] of cacheEntries) {
      if (!entry.pageCache || Object.keys(entry.pageCache).length === 0) continue;
      
      // Check timestamp - don't cache expired items
      if (isExpired(entry.updatedAt)) continue;
      
      const validPageEntry = Object.entries(entry.pageCache).find(
        ([_, products]) => products && products.length > 0
      );
      
      if (validPageEntry) {
        const [pageStr, products] = validPageEntry;
        await indexedDbService.saveProducts(
          cacheKey,
          products,
          parseInt(pageStr),
          entry.totalResults,
          entry.pageCache
        );
      }
    }
    
    // Sync offers - STRICT filtering
    const offerEntries = Object.entries(state.productOffers);
    for (const [productId, offerEntry] of offerEntries) {
      // NEVER cache if:
      // - No offers
      // - Empty offers array
      // - isError = true
      // - fetchedAt = 0 (error state)
      // - Expired
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
