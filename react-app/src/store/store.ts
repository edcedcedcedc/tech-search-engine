import { create } from "zustand";

type ThemeMode = "light" | "dark";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { getProductOffers as apiGetProductOffers } from "../api/searchApi";
import { searchProducts as apiSearchProducts } from "../api/searchApi";

interface CookieState {
  consent: boolean | null; // null = not answered yet
  accept: () => void;
  decline: () => void;
}

interface State {


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
    // cache: don’t refetch if already loaded
    if (productOffers[productId]) {
      set({ selectedProductId: productId });
      return;
    }
    set({ isOffersLoading: true, selectedProductId: productId });

    const data = await apiGetProductOffers(productId, true);

    set((state) => ({
      productOffers: {
        ...state.productOffers,
        [productId]: data.offers,
      },
      isOffersLoading: false,
    }));
  },
  closeProduct: () => set({ selectedProductId: null }),
  
  isLoading: false,
  setIsLoading: (value: boolean) => set({ isLoading: value }),
  
 
  // UPDATED: searchProducts with caching
  searchProducts: async (query?: string, lang?: string, page: number = 1) => {
    const q = query ?? get().query;
    
    if (!q) return;
    
    const currentCacheKey = generateCacheKey(q, lang);
    const { pageCache, queryCacheKey } = get();
    
    // Check if query changed - clear cache if it did
    if (currentCacheKey !== queryCacheKey) {
      set({ pageCache: {}, queryCacheKey: currentCacheKey });
    }
    
    // Check cache first
    const cachedPage = pageCache[page];
    if (cachedPage) {
      // Use cached data
      set({ 
        aggregatedProducts: cachedPage,
        currentPage: page,
        isLoading: false 
      });
      return;
    }
    
    try {
      set({ isLoading: true });
      
      const limit = 20;
      let cursor: string | undefined;
      
      if (page > 1) {
        const offset = (page - 1) * limit;
        cursor = offset.toString();
      }
      
      const data = await apiSearchProducts(q, lang, limit, cursor);
      const totalCount = data.total_count;
      
      // Cache this page
      const newCache = { ...pageCache, [page]: data.products };


      // Limit cache size (optional - keep last 10 pages)
      if (Object.keys(newCache).length > 10) {
        // Remove oldest page (lowest page number)
        const oldestPage = Math.min(...Object.keys(newCache).map(Number));
        delete newCache[oldestPage];
      }
      
      set({
        aggregatedProducts: data.products,
        currentPage: page,
        nextCursor: data.next_cursor || null,
        totalResults: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        pageCache: newCache,
        queryCacheKey: currentCacheKey,
        isLoading: false
      });
      
    } catch (err) {
      console.error("Search error:", err);
      set({ isLoading: false });
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
  
  pageCache: {},
  queryCacheKey: '',
  clearCache: () => set({ 
  pageCache: {}, 
  queryCacheKey: '',
  currentPage: 1,
  totalPages: 0,
  totalResults: 0
}),
}));
