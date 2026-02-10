import axios from "axios";
import { uiLog } from "../webhook/client/sender"; // <-- import logger
import i18n from "../i18n";
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
   /*  if (Math.random() < 0.9) { // 30% chance
      const e = new Error("TOO_MANY_REQUESTS");
      //(e as any).code = 429;
      throw e;
    } */
    uiLog(`api | searchProducts | response | query=${query} | results=${data.products.length} | total_count=${data.total_count}`);
    return data;
  } catch (err: any) {
    const status = err?.response?.status;
    
    if (status === 403) {
      const e = new Error("SESSION_EXPIRED");
      (e as any).code = 403;
      throw e;
    }

     if (err.code === "ERR_NETWORK") {
      const e = new Error("NETWORK_ERROR");
      (e as any).code = "NETWORK_ERROR";
      throw e;
    }
 
    uiLog(`api | searchProducts | error | query=${query} | err=${err?.message}`);
    throw err; // <-- throw all other errors
  }
};

/**
 * Layer 2: Product offers (full or preview)
 */
export const getProductOffers = async (
  productId: string,
  full = true,
  limit?: number,
  cursor?: string,
  retry429 = 0,
  retry500 = 0
): Promise<{
  offers: AggregatedProduct["offers"];
  has_more: boolean;
  next_cursor?: string;
}> => {
  const params: Record<string, any> = { full };
  if (limit) params.limit = limit;
  if (cursor) params.cursor = cursor;

  try {
    const res = await api.get(`/product/${productId}/offers/`, {
      params,
      withCredentials: true,
    });

    const data = res?.data ?? {};

    // -----------------------------
    // FORCE 429 for first 3 retries
    // -----------------------------
        /* if (Math.random() < 0.9) { // 30% chance
      const e = new Error("TOO_MANY_REQUESTS");
      //(e as any).code = 429;
      throw e;
    }  */

    // -----------------------------
    // normal return
    // -----------------------------
    return {
      offers: Array.isArray(data.offers) ? data.offers : [],
      has_more: Boolean(data.has_more),
      next_cursor: data.next_cursor,
    };
  } catch (err: any) {
    const status = err?.response?.status || (err.code === 429 ? 429 : undefined);

    if (status === 403) {
      const e = new Error("SESSION_EXPIRED");
      (e as any).code = 403;
      throw e;
    }

    if (status === 429 && retry429 < 5) {
      uiLog(`getProductOffers | 429 detected, retrying #${retry429 + 1} in 5s`);
      await new Promise((r) => setTimeout(r, 5000));
      return getProductOffers(productId, full, limit, cursor, retry429 + 1, retry500);
    }

    if (status === 500 && retry500 < 3) {
      await new Promise((r) => setTimeout(r, 1000 * (retry500 + 1)));
      return getProductOffers(productId, full, limit, cursor, retry429, retry500 + 1);
    }

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


