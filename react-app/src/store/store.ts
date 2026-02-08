import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uiLog } from "../webhook/client/sender";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { getProductOffers as apiGetProductOffers } from "../api/searchApi";
import { searchProducts as apiSearchProducts } from "../api/searchApi";


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
const MAX_PAGES_PER_QUERY = 10;

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
}

interface State {
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
}

/* =========================
   HELPERS
========================= */

const generateCacheKey = (query: string, lang?: string) =>
  `${query}-${lang || "en"}`;

const isExpired = (ts: number) => Date.now() - ts > CACHE_MAX_AGE;

/* =========================
   STORE
========================= */

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      /* ================= UI ================= */


  

      /* ================= SEARCH ================= */

      query: "",
      setQuery: (q) => set({ query: q }),

      aggregatedProducts: [],
      currentPage: 1,
      totalPages: 0,
      totalResults: 0,
      itemsPerPage: 20,

      isLoading: false,
      setIsLoading: (v) => set({ isLoading: v }),

      searchProducts: async (query, lang, page = 1) => {
        const q = query ?? get().query;
        if (!q) return;

        const cacheKey = generateCacheKey(q, lang);
        const { multiQueryCache, itemsPerPage } = get();

        const cached = multiQueryCache[cacheKey];

        if (cached && !isExpired(cached.updatedAt)) {
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

        set({ isLoading: true });

        const cursor =
          page > 1 ? ((page - 1) * itemsPerPage).toString() : undefined;

        const data = await apiSearchProducts(q, lang, itemsPerPage, cursor);

        set((s) => ({
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
        }));
      },

      /* ================= CACHE ================= */

      multiQueryCache: {},
      queryCacheKey: "",
      clearCache: () =>
        set({
          multiQueryCache: {},
          aggregatedProducts: [],
          currentPage: 1,
          totalPages: 0,
          totalResults: 0,
        }),

      /* ================= OFFERS ================= */

      selectedProductId: null,
      productOffers: {},
      isOffersLoading: false,

      openProduct: async (productId) => {
        const cached = get().productOffers[productId];

        if (cached && Date.now() - cached.fetchedAt < OFFERS_CACHE_TTL) {
          set({ selectedProductId: productId });
          return;
        }

        set({ isOffersLoading: true, selectedProductId: productId });

        const data = await apiGetProductOffers(productId, true);

        set((s) => ({
          productOffers: {
            ...s.productOffers,
            [productId]: {
              offers: data.offers,
              fetchedAt: Date.now(),
            },
          },
          isOffersLoading: false,
        }));
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
