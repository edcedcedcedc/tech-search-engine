
import { create } from "zustand";
import { uiLog } from "../webhook/client/sender";
type ThemeMode = "light" | "dark";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { getProductOffers as apiGetProductOffers } from "../api/searchApi";
import { searchProducts as apiSearchProducts } from "../api/searchApi";


// ---- ADD THIS AT THE TOP, BEFORE useStore ----



const SESSION_STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB
const CACHE_TIMESTAMP_KEY = "searchCacheTimestamp";
const CACHE_MAX_AGE = 3 * 60 * 60 * 1000; // 3 hours in ms

let multiQueryCache: Record<string, { pageCache: Record<number, AggregatedProduct[]>; totalResults: number }> = {};
let initialCache = {};
let initialQueryKey = '';

if (typeof window !== "undefined") {
  const cached = sessionStorage.getItem("searchCache");
  const ts = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
  const now = Date.now();
  let expired = false;

  if (cached && ts) {
    if (now - parseInt(ts, 10) > CACHE_MAX_AGE) {
      expired = true;
      uiLog(`useStore | session cache expired after 3h`);
    } else {
      try {
        multiQueryCache = JSON.parse(cached) || {};
        initialQueryKey = Object.keys(multiQueryCache)[0] || '';
        uiLog(`useStore | loaded multi-query cache | queries=${Object.keys(multiQueryCache).length} | initialQuery=${initialQueryKey}`);
      } catch (err) {
        uiLog(`useStore | failed to parse sessionStorage cache | error=${(err as any)?.message}`);
        expired = true;
      }
    }
  } else {
    uiLog("useStore | no sessionStorage cache found");
  }

  if (expired) {
    multiQueryCache = {};
    initialCache = {};
    initialQueryKey = '';
    sessionStorage.removeItem("searchCache");
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    uiLog("useStore | cleared expired session cache");
  }
}

// Helper: estimate sessionStorage usage in bytes
const getSessionStorageSize = () => {
  let total = 0;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key) continue;
    const value = sessionStorage.getItem(key) || "";
    total += key.length + value.length;
  }
  return total * 2; // approx bytes (UTF-16)
};


// Helper: trim oldest queries if we're near limit
const trimSessionCacheIfNeeded = () => {
  let size = getSessionStorageSize();
  while (size > SESSION_STORAGE_LIMIT) {
    const oldestQuery = Object.keys(multiQueryCache)[0];
    if (!oldestQuery) break;
    delete multiQueryCache[oldestQuery];
    uiLog(`trimSessionCacheIfNeeded | removed oldest query=${oldestQuery} | newSize=${size}`);
    try {
      sessionStorage.setItem("searchCache", JSON.stringify(multiQueryCache));
    } catch {}
    size = getSessionStorageSize();
  }
};


const OFFERS_CACHE_KEY = "offersCache";
const OFFERS_CACHE_TTL = 30 * 60 * 1000; // 30 min

let offersSessionCache: Record<
  string,
  { offers: any[]; fetchedAt: number }
> = {};


if (typeof window !== "undefined") {
  try {
    const raw = sessionStorage.getItem(OFFERS_CACHE_KEY);
    if (raw) offersSessionCache = JSON.parse(raw);
  } catch {
    offersSessionCache = {};
  }
}


const getCachedOffers = (productId: string) => {
  const entry = offersSessionCache[productId];
  if (!entry) return null;

  if (Date.now() - entry.fetchedAt > OFFERS_CACHE_TTL) {
    delete offersSessionCache[productId];
    return null;
  }

  return entry.offers;
};


interface CookieState {
  consent: boolean | null; // null = not answered yet
  accept: () => void;
  decline: () => void;
}

interface State {


  //offers
  offersSortColumn: "price" | "shop" | null;
  offersSortAscending: boolean;
  setOffersSort: (column: "price" | "shop") => void;


  currentPage: number;
  totalPages: number;
  totalResults: number;
  nextCursor: string | null;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setTotalResults: (count: number) => void;
  setNextCursor: (cursor: string | null) => void;
  
  
  pageCache: Record<number, AggregatedProduct[]>; // Cache for loaded pages
  queryCacheKey: string; // To track current search query for cache invalidation

  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  
  
  isLoading: boolean;   // new
  setIsLoading: (value: boolean) => void; // new

  closeProduct: any;
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  cookie: CookieState;

  clearCache: () => void;

  searchProducts: (query?: string, lang?: string, page?: number) => Promise<void>;

  aggregatedProducts: AggregatedProduct[];
  setAggregatedProducts: (products: AggregatedProduct[]) => void;
  addOrUpdateProduct: (product: AggregatedProduct) => void;
  clearProducts: () => void;

  query: string;
  setQuery: (q: string) => void;

  openProduct: (productId: string) => Promise<void>;
  selectedProductId: string | null;
  productOffers: Record<string, AggregatedProduct["offers"]>;
  isOffersLoading: boolean;
}

const COOKIE_NAME = "myAppCookieConsent";

// Helper to generate cache key
const generateCacheKey = (query: string, lang?: string) => {
  return `${query}-${lang || 'en'}`;
};

export const useStore = create<State>((set, get) => ({
  mode: (typeof window !== "undefined" ? (localStorage.getItem("theme") as ThemeMode) : null) || "dark",
  toggleMode: () =>
    set((state) => {
      const next = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return { mode: next };
    }),
  setMode: (mode) => {
    localStorage.setItem("theme", mode);
    set({ mode });
  },
  cookie: {
    consent:
      typeof window !== "undefined"
        ? document.cookie.includes(`${COOKIE_NAME}=true`)
          ? true
          : document.cookie.includes(`${COOKIE_NAME}=false`)
          ? false
          : null
        : null,
    accept: () =>
      set((state) => {
        if (typeof document !== "undefined") {
          document.cookie = `${COOKIE_NAME}=true; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
        }
        return {
          cookie: {
            ...state.cookie,
            consent: true,
          },
        };
      }),
    decline: () =>
      set((state) => {
        if (typeof document !== "undefined") {
          document.cookie = `${COOKIE_NAME}=false; path=/; max-age=${60 * 60 * 24 * 365}`;
        }
        return {
          cookie: {
            ...state.cookie,
            consent: false,
          },
        };
      }),
  },
  aggregatedProducts: [],
  selectedProductId: null,
  productOffers: {},
  
  isOffersLoading: false,
  setAggregatedProducts: (products) => set({ aggregatedProducts: products }),
  addOrUpdateProduct: (product) =>
    set((state) => {
      const index = state.aggregatedProducts.findIndex((p) => p.id === product.id);
      if (index > -1) {
        // update existing product
        const updated = [...state.aggregatedProducts];
        updated[index] = product;
        return { aggregatedProducts: updated };
      } else {
        // add new product
        return { aggregatedProducts: [...state.aggregatedProducts, product] };
      }
    }),
  
    clearProducts: () => set({ aggregatedProducts: [] }),
  
  query: "",
  setQuery: (q) => set({ query: q }),

  openProduct: async (productId) => {
    const { productOffers } = get();
    uiLog(`offers | open_start | productId=${productId}`);

    // memory: don’t refetch if already loaded
    if (productOffers[productId]) {
      uiLog(
        `offers | memory_cache_hit | productId=${productId} | offersLoaded=${productOffers[productId].length}`
      );
      set({ selectedProductId: productId });
      return;
    }

    // Session cache (second layer)
    const cached = getCachedOffers(productId);
    if (cached) {
      uiLog(`offers | load_from_session_cache | productId=${productId} | offers=${cached.length}`);
      set((state) => ({
        selectedProductId: productId,
        productOffers: {
          ...state.productOffers,
          [productId]: cached,
        },
      }));
      return;
    }

    uiLog(`offers | fetch_start | productId=${productId}`);
    set({ isOffersLoading: true, selectedProductId: productId });

    try {
      const data = await apiGetProductOffers(productId, true);
      uiLog(
        `offers | fetch_success | productId=${productId} | offers=${data.offers.length}`
      );

      // update memory cache
      offersSessionCache[productId] = {
        offers: data.offers,
        fetchedAt: Date.now(),
      };
      uiLog(
        `offers | memory_cache_write | productId=${productId} | cacheSize=${Object.keys(
          offersSessionCache
        ).length}`
      );

      // update sessionStorage
      try {
        sessionStorage.setItem(
          OFFERS_CACHE_KEY,
          JSON.stringify(offersSessionCache)
        );
        uiLog(
          `offers | sessionStorage_write_success | productId=${productId} | bytes=${
            JSON.stringify(offersSessionCache[productId]).length * 2
          }`
        );
      } catch (err) {
        uiLog(
          `offers | sessionStorage_write_failed | productId=${productId} | error=${
            (err as any)?.message
          }`
        );
      }

      // update store
      set((state) => {
        uiLog(
          `offers | store_update | productId=${productId} | prevOffers=${state.productOffers[productId]?.length ?? 0} | newOffers=${data.offers.length}`
        );
        return {
          productOffers: {
            ...state.productOffers,
            [productId]: data.offers,
          },
          isOffersLoading: false,
        };
      });
    } catch (err) {
      uiLog(
        `offers | fetch_error | productId=${productId} | error=${(err as any)?.message}`
      );
      set({ isOffersLoading: false });
    }

    uiLog(`offers | open_end | productId=${productId}`);
  },
  
  closeProduct: () => set({ selectedProductId: null }),
  
  isLoading: false,
  setIsLoading: (value: boolean) => set({ isLoading: value }),
  
 
searchProducts: async (query?: string, lang?: string, page: number = 1) => {
  const q = query ?? get().query;
   // Start search
  uiLog(`searchProducts | start | query=${q} | lang=${lang} | page=${page}`);
  if (!q) return;

 


 

  const currentCacheKey = generateCacheKey(q, lang);
  const prevCacheKey = get().queryCacheKey;

  // Invalidate cache if query/lang changed
  if (currentCacheKey !== prevCacheKey) {
    uiLog(`searchProducts | invalidate_cache | prev=${prevCacheKey} | current=${currentCacheKey}`);
    set({
      pageCache: {},
      queryCacheKey: currentCacheKey,
      currentPage: 1,
    });
  }

   // Get cached data for this specific query
  let cachedQueryData = multiQueryCache[currentCacheKey];
  let pageCache = cachedQueryData?.pageCache || {};
  let totalCount = cachedQueryData?.totalResults || 0;

  const cachedPage = pageCache[page];

  if (cachedPage) {
  uiLog(`searchProducts | load_from_multi_query_cache | query=${currentCacheKey} | page=${page} | cachedCount=${cachedPage.length} | totalResults=${totalCount}`);

  set({
      aggregatedProducts: cachedPage,
      currentPage: page,
      totalResults: totalCount,
      totalPages: Math.ceil(totalCount / (get().itemsPerPage || 20)),
      pageCache,
      queryCacheKey: currentCacheKey,
      isLoading: false,
    });
    return;
  }

  try {
    set({ isLoading: true });

    const limit = get().itemsPerPage || 20;
    const cursor = page > 1 ? ((page - 1) * limit).toString() : undefined;

    // Call API
    uiLog(`searchProducts | call_api | query=${q} | lang=${lang} | page=${page} | limit=${limit} | cursor=${cursor}`);

    const data = await apiSearchProducts(q, lang, limit, cursor);
    const totalCount = data.total_count;

    // Cache page
    const newCache = { ...get().pageCache, [page]: data.products };
    uiLog(`searchProducts | cache_page | page=${page} | productsCount=${data.products.length}`);

    // Optional LRU trim
    if (Object.keys(newCache).length > 10) {
      const oldestPage = Math.min(...Object.keys(newCache).map(Number));
      delete newCache[oldestPage];
      uiLog(`searchProducts | trim_lru_cache | removedPage=${oldestPage}`);
    }
    multiQueryCache[currentCacheKey] = { pageCache: newCache, totalResults: totalCount };
    // Save to sessionStorage with auto-trim
    try {
      trimSessionCacheIfNeeded(); // trim if over 5MB
      sessionStorage.setItem("searchCache", JSON.stringify(multiQueryCache));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString()); // <-- set timestamp
      uiLog(`searchProducts | saved_multi_query_cache with timestamp | totalQueries=${Object.keys(multiQueryCache).length}`);
    } catch (err) {
      uiLog(`searchProducts | failed_to_save_multi_query_cache | error=${(err as any)?.message}`);
    }

    set({
      aggregatedProducts: data.products,
      currentPage: page,
      nextCursor: data.next_cursor || null,
      totalResults: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      pageCache: newCache,
      isLoading: false,
    });

    // Search complete
    uiLog(`searchProducts | complete | totalResults=${totalCount} | totalPages=${Math.ceil(totalCount / limit)}`);

  } catch (err) {
    set({ isLoading: false });
    uiLog(`searchProducts | error | ${(err as any)?.message}`);
  }
},


   // Pagination state initialization
  currentPage: 1,
  totalPages: 0,
  totalResults: 0,
  nextCursor: null,
  
  // Pagination actions
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  setTotalResults: (count) => set({ totalResults: count }),
  setNextCursor: (cursor) => set({ nextCursor: cursor }),
  

  //Cache 
  pageCache: initialCache,
  queryCacheKey: initialQueryKey,
  
  clearCache: () => set({ 
  pageCache: {}, 
  queryCacheKey: '',
  currentPage: 1,
  totalPages: 0,
  totalResults: 0
}),

itemsPerPage: 20, // default
setItemsPerPage: (count: number) => {
  set({ itemsPerPage: count, currentPage: 1 });
},
  //offers sorting 
offersSortColumn: "price", // default sorting
offersSortAscending: true,
setOffersSort: (column) =>
  set((state) => ({
    offersSortColumn: column,
    offersSortAscending:
      state.offersSortColumn === column ? !state.offersSortAscending : true,
  })),
}));
