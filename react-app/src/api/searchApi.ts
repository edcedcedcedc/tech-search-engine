import axios from "axios";
import { uiLog } from "../webhook/client/sender"; // <-- import logger

// ---------------- Types ----------------
import type { AggregatedProduct } from "../types/AggregatedProduct";
import type { SearchResponse } from "../types/SearchResponse";
import type { AutocompleteResponse } from "../types/AutocompleteResponse";
import { useNotificationStore } from "../store/store";

// ---------------- Axios instance ----------------
const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    Accept: "application/json",
  }
});

// ---------------- API functions ----------------

/**
 * Layer 1: Search products
 */
export const searchProducts = async (
  query: string,
  lang?: string,
  limit?: number,
  cursor?: string,
  offset?: number
): Promise<SearchResponse> => {
  const params: Record<string, any> = { q: query };
  if (lang) params.lang = lang;
  if (limit) params.limit = limit;

  if (cursor !== undefined) {
    params.cursor = cursor;
  } else if (offset !== undefined) {
    params.cursor = offset.toString();
  }

  uiLog(`api | searchProducts | request | query=${query} | lang=${lang} | limit=${limit} | cursor=${params.cursor}`);

  try {
    const { data } = await api.get<SearchResponse>("/search/", { params, withCredentials: true });
    uiLog(`api | searchProducts | response | query=${query} | results=${data.products.length} | total_count=${data.total_count}`);
    return data;
  } catch (err) {
    uiLog(`api | searchProducts | error | query=${query} | err=${(err as any)?.message}`);
    throw err;
  }
};

/**
 * Layer 2: Product offers (full or preview)
 */
export const getProductOffers = async (
  productId: string,
  full = false,
  limit?: number,
  cursor?: string
): Promise<{ offers: AggregatedProduct["offers"]; has_more: boolean; next_cursor?: string }> => {
  const params: Record<string, any> = { full };
  if (limit) params.limit = limit;
  if (cursor) params.cursor = cursor;

  uiLog(`api | getProductOffers | request | productId=${productId} | full=${full} | limit=${limit} | cursor=${cursor}`);

  try {
    const { data } = await api.get(`/product/${productId}/offers/`, {
      params,
      withCredentials: true, // <-- ensures session cookies are sent
    });

    uiLog(`api | getProductOffers | response | productId=${productId} | offers=${data.offers.length} | has_more=${data.has_more}`);
    return data;
  } catch (err) {
    uiLog(`api | getProductOffers | error | productId=${productId} | err=${(err as any)?.message}`);
    throw err;
  }
};


export default api;

/**
 * Autocomplete suggestions
 */
export const autocomplete = async (
  query: string,
  lang?: string
): Promise<AutocompleteResponse> => {
  const params: Record<string, any> = { q: query };
  if (lang) params.lang = lang;

  uiLog(`api | autocomplete | request | query=${query} | lang=${lang}`);

  try {
    const { data } = await api.get<AutocompleteResponse>("/autocomplete/", { params });
    uiLog(`api | autocomplete | response | query=${query} | suggestions=${data.suggestions.length}`);
    return data;
  } catch (err) {
    uiLog(`api | autocomplete | error | query=${query} | err=${(err as any)?.message}`);
    throw err;
  }
};



// Axios response interceptor for errors
api.interceptors.response.use(
  (response) => response, // pass through successful responses
  (error) => {
    const status = error?.response?.status;

    // map status to notification type and message
    let type: "error" = "error";
    let message = "An unexpected error occurred.";

    switch (status) {
      case 404:
        message = "Resource not found (404).";
        break;
      case 403:
        message = "You are not authorized to access this resource (403).";
        break;
      case 429:
        message = "Too many requests (429). Please try again later.";
        break;
      case 500:
        message = "Internal server error (500).";
        break;
      default:
        if (error?.message) message = error.message;
        break;
    }

    // Add to notification store
    const addNotification = useNotificationStore.getState().addNotification;
    addNotification({ message, type, duration: 3000 });

    return Promise.reject(error); // keep rejecting so the original caller can handle it
  }
);