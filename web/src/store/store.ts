import { create } from "zustand";

type ThemeMode = "light" | "dark";
import type { AggregatedProduct } from "../types/AggregatedProduct";
import { getProductOffers } from "../api/searchApi";
import { searchProducts as apiSearchProducts } from "../api/searchApi";
interface CookieState {
  consent: boolean | null; // null = not answered yet
  accept: () => void;
  decline: () => void;
}

interface State {
  closeProduct: any;
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  cookie: CookieState;
  searchProducts: (query?: string) => Promise<void>;

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

    const data = await getProductOffers(productId, true);

    set((state) => ({
      productOffers: {
        ...state.productOffers,
        [productId]: data.offers,
      },
      isOffersLoading: false,
    }));
  },
  closeProduct: () => set({ selectedProductId: null }),
  searchProducts: async (query?: string) => {
    const q = query ?? get().query; // use argument or fallback to current query
    if (!q) return;

    try {
      set({ aggregatedProducts: [] }); // optional: clear old results
      const data = await apiSearchProducts(q);
      console.log(data.products)
      set({ aggregatedProducts: data.products });
    } catch (err) {
      console.error("Search error:", err);
    }
  },
}));
