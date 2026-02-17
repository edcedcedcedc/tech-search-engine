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
      query:"",
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
        if (query) {
          set({ query: query });
        }
        uiLog(`Search products=${query}`);

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

        // In searchProducts, add this check at the beginning:
        // If sync was triggered and we have cached data, reload from IndexedDB
        if (get().syncTriggered > 0 && cached) {
          // Force reload from IndexedDB
          set({ syncTriggered: 0 });
          // Continue to STEP 2 to reload from IndexedDB
        }else if (cached && !isExpired(cached.updatedAt)) {
          useLastQueryStore.getState().setLastQuery(q, lang || "en", page);
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
            // VALIDATE AND FIX: Check for corrupted data (offers as number)
            const fixedPageCache: Record<number, AggregatedProduct[]> = {};
            
            Object.entries(indexedDbCache.pageCache).forEach(([pageNum, products]) => {
              fixedPageCache[Number(pageNum)] = products.map(validateAndFixCachedProduct);
            });
            
            const pageData = fixedPageCache[page];
            if (pageData && pageData.length > 0) {
              const [q, lang] = cacheKey.split("-");
              useLastQueryStore.getState().setLastQuery(q, lang || "en", page);

               // TRIGGER PREFETCH HERE! This is the missing piece
              const productIds = pageData.map(p => p.id).filter(Boolean);
              if (productIds.length > 0 && !get().isOffline) {
                uiLog(`[Store] Triggering prefetch for ${productIds.length} products from IndexedDB cache`);
                prefetchService.addToQueue(productIds, q);
              }



              // Restore to Zustand memory cache with FIXED data
              set((s) => ({
                aggregatedProducts: pageData,
                currentPage: page,
                totalResults: indexedDbCache.totalResults,
                totalPages: Math.ceil(indexedDbCache.totalResults / itemsPerPage),
                multiQueryCache: {
                  ...s.multiQueryCache,
                  [cacheKey]: {
                    pageCache: fixedPageCache, // Store the fixed version
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
        }

        // ============= STEP 3: Fetch from API =============
        if (hydrating) { 
          set({ isLoading: false });
        } else {
          set({ isLoading: true });
        }
        
        const cursor = page > 1 ? ((page - 1) * itemsPerPage).toString() : undefined;

        try {
          const data = await apiSearchProducts(q, lang, itemsPerPage, cursor);
          
          // TRANSFORM: Convert API products (with offers as number) to store products (with offers as empty array)
          const transformedProducts = data.products.map(transformSearchResult);

          // TRIGGER PREFETCH HERE - fire and forget!
          const productIds = transformedProducts
            .map(p => p.id)
            .filter(Boolean); 
          if (productIds.length > 0 && !get().isOffline) {
            prefetchService.addToQueue(productIds, q);
          }

          // Prefetch next pages
          if (data.total_count > page * itemsPerPage && !get().isOffline) {
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

          // Only update lastQuery on SUCCESSFUL API response                     
          useLastQueryStore.getState().setLastQuery(q, lang || "en", page);
          
          // Update Zustand state with TRANSFORMED products
          set((s: State) => {
            // Create properly typed pageCache
            const updatedPageCache: Record<number, AggregatedProduct[]> = {
              ...(cached?.pageCache ?? {}),
              [page]: transformedProducts,
            };

            // Create properly typed multiQueryCache entry
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
            set({ hasFreshResults: false });
            freshResultsTimeout = null;
          }, 1000);

        } catch (err: any) {
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

          if (!err.response || err.code === "ERR_NETWORK" || err.message === "Network Error") {
            return;
          }
          
          addNotification({
            message: i18n.t("Error_Generic"),
            type: "error",
            duration: 5000,
          });
          throw err;
        } finally {
          set({ isLoading: false });
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
        prefetchService.removeFromQueue([productId]);

        uiLog(`[openProduct] ========== START for productId=${productId} ==========`);
        
        // Find the product in aggregatedProducts to get offers_count from Layer 1
        const product = get().aggregatedProducts.find(p => p.id === productId);
        const expectedOffersCount = product?.offers_count;
        
        uiLog(`[openProduct] 🔍 LAYER 1 DATA: productId=${productId}, found=${!!product}`);
        if (product) {
          uiLog(`[openProduct] 📊 LAYER 1: name="${product.name}", offers_count=${product.offers_count}, lowest_price=${product.lowest_price}`);
        } else {
          uiLog(`[openProduct] ⚠️ WARNING: Product ${productId} not found in aggregatedProducts!`);
        }

        // ============= STEP 1: Check Zustand memory cache =============
        if (cached) {
          uiLog(`[openProduct] 📦 STEP 1: Zustand cache check for ${productId}`);
          uiLog(`[openProduct] 📦 Zustand cache: offers.length=${cached.offers.length}, fetchedAt=${new Date(cached.fetchedAt).toISOString()}, age=${Math.round((Date.now() - cached.fetchedAt)/1000)}s, isError=${cached.isError}`);
          
          if (cached.offers.length > 0 && Date.now() - cached.fetchedAt < OFFERS_CACHE_TTL) {
            uiLog(`[openProduct] 📦 STEP 1: Using cached offers from Zustand for ${productId}`);
            
            // VALIDATE: Check if cached offers count matches expected from Layer 1
            if (expectedOffersCount !== undefined) {
              if (cached.offers.length === expectedOffersCount) {
                uiLog(`[openProduct] ✅ VALIDATION PASSED: Zustand offers count (${cached.offers.length}) matches Layer 1 expected (${expectedOffersCount})`);
              } else {
                uiLog(`[openProduct] ❌ VALIDATION FAILED: Zustand offers count (${cached.offers.length}) DOES NOT MATCH Layer 1 expected (${expectedOffersCount})`);
                uiLog(`[openProduct] ⚠️ Cache corruption detected! Invalidating and fetching fresh...`);
                
                // Invalidate cache and continue to fetch fresh
                set((s) => {
                  const newProductOffers = { ...s.productOffers };
                  delete newProductOffers[productId];
                  return { productOffers: newProductOffers };
                });
                // Continue to STEP 2/3 instead of returning
              }
            }
            
            if (!expectedOffersCount || cached.offers.length === expectedOffersCount) {
              set({ selectedProductId: productId });
              uiLog(`[openProduct] ✅ STEP 1: Returning with ${cached.offers.length} cached offers`);
              return;
            }
          } else {
            if (cached.offers.length === 0) {
              uiLog(`[openProduct] 📦 STEP 1: Zustand cache has empty offers array`);
            }
            if (Date.now() - cached.fetchedAt >= OFFERS_CACHE_TTL) {
              uiLog(`[openProduct] 📦 STEP 1: Zustand cache expired (age=${Math.round((Date.now() - cached.fetchedAt)/1000)}s > ${OFFERS_CACHE_TTL/1000}s)`);
            }
          }
        } else {
          uiLog(`[openProduct] 📦 STEP 1: No Zustand cache found for ${productId}`);
        }

        // ============= STEP 2: Check IndexedDB =============
        try {
          uiLog(`[openProduct] 💾 STEP 2: Checking IndexedDB for ${productId}`);
          const indexedDbOffers = await indexedDbService.getOffers(productId);
          
          uiLog(`[openProduct] 💾 IndexedDB response: ${indexedDbOffers ? 'found' : 'not found'}`);
          if (indexedDbOffers) {
            uiLog(`[openProduct] 💾 IndexedDB offers: count=${indexedDbOffers.offers.length}, fetchedAt=${new Date(indexedDbOffers.fetchedAt).toISOString()}, age=${Math.round((Date.now() - indexedDbOffers.fetchedAt)/1000)}s`);
            
            // Log first few offer IDs if any
            if (indexedDbOffers.offers.length > 0) {
              uiLog(`[openProduct] 💾 IndexedDB first 3 offer IDs: ${indexedDbOffers.offers.slice(0, 3).map(o => o.id).join(', ')}`);
            }
          }

          if (indexedDbOffers && indexedDbOffers.offers.length > 0 && Date.now() - indexedDbOffers.fetchedAt < OFFERS_CACHE_TTL) {
            uiLog(`[openProduct] 💾 STEP 2: Restoring offers from IndexedDB for ${productId}`);
            
            // VALIDATE: Check if IndexedDB offers count matches expected from Layer 1
            if (expectedOffersCount !== undefined) {
              if (indexedDbOffers.offers.length === expectedOffersCount) {
                uiLog(`[openProduct] ✅ VALIDATION PASSED: IndexedDB offers count (${indexedDbOffers.offers.length}) matches Layer 1 expected (${expectedOffersCount})`);
              } else {
                uiLog(`[openProduct] ❌ VALIDATION FAILED: IndexedDB offers count (${indexedDbOffers.offers.length}) DOES NOT MATCH Layer 1 expected (${expectedOffersCount})`);
                uiLog(`[openProduct] ⚠️ IndexedDB corruption detected! Invalidating and fetching fresh...`);
                
                // Clear corrupted data and continue to fetch
                await indexedDbService.saveOffers(productId, []); // Clear it
                // Continue to STEP 3
              }
            }
            
            if (!expectedOffersCount || indexedDbOffers.offers.length === expectedOffersCount) {
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
              uiLog(`[openProduct] ✅ STEP 2: Restored ${indexedDbOffers.offers.length} offers from IndexedDB`);
              return;
            }
          } else if (indexedDbOffers && indexedDbOffers.offers.length === 0) {
            uiLog(`[openProduct] 💾 STEP 2: IndexedDB has empty offers array`);
          } else if (indexedDbOffers && Date.now() - indexedDbOffers.fetchedAt >= OFFERS_CACHE_TTL) {
            uiLog(`[openProduct] 💾 STEP 2: IndexedDB cache expired (age=${Math.round((Date.now() - indexedDbOffers.fetchedAt)/1000)}s)`);
          }
        } catch (error) {
          uiLog(`[openProduct] 💾 STEP 2: Failed to read offers from IndexedDB: ${error}`);
        }

        // ============= STEP 3: Fetch from API =============
        uiLog(`[openProduct] 🌐 STEP 3: Fetching offers from API for ${productId}`);
        set({ isOffersLoading: true, selectedProductId: productId });

        try {
          const data = await apiGetProductOffers(productId, true, get().query);

          uiLog(`[openProduct] 🌐 API response received for ${productId}`);
          uiLog(`[openProduct] 🌐 API response: offers_count=${data.offers?.length || 0}, has_more=${data.has_more}, next_cursor=${data.next_cursor}`);

          // Defensive check
          if (!data.offers) {
            uiLog(`[openProduct] ❌ API returned no offers array for ${productId}`);
            const error = new Error("EMPTY_OFFERS");
            (error as any).code = 404;
            throw error;
          }

          const actualOffersCount = data.offers.length;
          uiLog(`[openProduct] 🌐 API returned ${actualOffersCount} offers for ${productId}`);
          
          // Log first few offer IDs for debugging
          if (actualOffersCount > 0) {
            uiLog(`[openProduct] 🌐 First 3 offer IDs: ${data.offers.slice(0, 3).map(o => o.id).join(', ')}`);
            uiLog(`[openProduct] 🌐 First offer sample: shop=${data.offers[0].shop}, price=${data.offers[0].price}`);
          }

          // ============= CRITICAL VALIDATION: Layer 1 vs Layer 2 =============
          if (expectedOffersCount !== undefined) {
            if (actualOffersCount === expectedOffersCount) {
              uiLog(`[openProduct] ✅✅✅ LAYER MATCH: Layer 1 count (${expectedOffersCount}) === Layer 2 count (${actualOffersCount})`);
            } else {
              uiLog(`[openProduct] ❌❌❌ LAYER MISMATCH: Layer 1 count (${expectedOffersCount}) !== Layer 2 count (${actualOffersCount})`);
              uiLog(`[openProduct] 🔴 CRITICAL: Backend cache inconsistency detected!`);
              uiLog(`[openProduct] 📝 Product: ${productId}, Expected: ${expectedOffersCount}, Actual: ${actualOffersCount}`);
              
              // Log the full product for debugging
              if (product) {
                uiLog(`[openProduct] 📝 Product details: name="${product.name}", lowest_price=${product.lowest_price}`);
              }
              
              // If expected is 0 but we got offers, that's a big problem
              if (expectedOffersCount === 0 && actualOffersCount > 0) {
                uiLog(`[openProduct] 🔴 ERROR: Expected 0 offers but got ${actualOffersCount} - product should not have offers!`);
              }
              
              // If expected > 0 but got 0, that's also a problem
              if (expectedOffersCount > 0 && actualOffersCount === 0) {
                uiLog(`[openProduct] 🔴 ERROR: Expected ${expectedOffersCount} offers but got 0 - offers missing from cache!`);
              }
              
              // If we got more than expected (should never happen with backend fix)
              if (actualOffersCount > expectedOffersCount) {
                uiLog(`[openProduct] 🔴 ERROR: Got ${actualOffersCount} offers, expected only ${expectedOffersCount} - cache contains extra offers!`);
              }
              
              // If we got less than expected (pagination might be needed)
              if (actualOffersCount < expectedOffersCount) {
                uiLog(`[openProduct] ⚠️ WARNING: Got ${actualOffersCount} offers, expected ${expectedOffersCount} - possible pagination?`);
              }
            }
          } else {
            uiLog(`[openProduct] ⚠️ Cannot validate Layer 1 vs Layer 2 - product not found in aggregatedProducts`);
          }

          // Check if offers count exceeds max (should never happen with backend fix)
          if (actualOffersCount > 50) {
            uiLog(`[openProduct] 🔴 ERROR: API returned ${actualOffersCount} offers which exceeds max 50!`);
          }

          uiLog(`[openProduct] 💾 STEP 3: Updating state with ${actualOffersCount} offers`);

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
            
            uiLog(`[openProduct] 💾 Triggering IndexedDB sync`);
            syncCacheToIndexedDb({ ...s, ...newState } as State).catch(console.error);
            
            return newState;
          });

          uiLog(`[openProduct] ✅ STEP 3: Successfully fetched and stored ${actualOffersCount} offers`);

        } catch (err: any) {
          uiLog(`[openProduct] ❌ STEP 3: ERROR for ${productId}: ${err?.message} | code=${err?.code} | status=${err?.response?.status}`);

          set({ isOffersLoading: false });

          // Error handling with detailed logging
          if (err?.code === 0) {
            uiLog(`[openProduct] 🛑 Request aborted/cancelled`);
            set((s) => ({
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
            return;
          }

          if (err?.code === 404) {
            uiLog(`[openProduct] 🛑 404 Not Found - product may be deleted`);
            
            set((s) => ({
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
            return;
          }
                
          if (err?.code === 403) {
            uiLog(`[openProduct] 🛑 403 Session Expired`);
            get().openSessionExpired();
            set((s) => ({
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
            return;
          }

          if (err?.code === 429) {
            uiLog(`[openProduct] 🛑 429 Rate Limited`);
            set((s) => ({
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
            return;
          }

          if (!err.response || err.code === "ERR_NETWORK") {
            uiLog(`[openProduct] 🛑 Network Error - offline or connection issue`);
            set((s) => ({
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
            return;
          }
          
          // Generic error
          uiLog(`[openProduct] 🛑 Unhandled error: ${err}`);
        } finally {
          uiLog(`[openProduct] ========== END for productId=${productId} ==========`);
          set({ isOffersLoading: false });
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

      resetSessionData: async () => {
         /*  try {
          await flushSession();
            uiLog("Backend session flushed");
          } catch (error) {
            uiLog(`Failed to flush session: ${error}`);
          } */
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