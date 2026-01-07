// src/api/searchApi.ts
import axios from "axios";
// ---------------- Types ----------------
import type { AggregatedProduct } from "../types/AggregatedProduct";
import type { SearchResponse } from "../types/SearchResponse";
import type { AutocompleteResponse } from "../types/AutocompleteResponse";

// ---------------- Axios instance ----------------
// Using Vite proxy: baseURL points to the proxy /api
const api = axios.create({
  baseURL: "/api", // proxy in vite.config.ts will forward to Django
  timeout: 10000,
  headers: {
    "Accept": "application/json",
  },
  withCredentials: true, // keep credentials for sessions/cookies
});

// ---------------- API functions ----------------

/**
 * Layer 1: Search products
 * @param query Search query string
 * @param limit Number of products to fetch
 * @param cursor Optional cursor for pagination
 */
export const searchProducts = async (
  query: string,
  limit?: number,
  cursor?: string
): Promise<SearchResponse> => {
  const params: Record<string, any> = { q: query };
  if (cursor) params.cursor = cursor;
  if (limit) params.limit = limit;

  const { data } = await api.get<SearchResponse>("/search", { params });
  return data;
};

/**
 * Autocomplete suggestions
 * @param query User input string
 */
export const autocomplete = async (
  query: string
): Promise<AutocompleteResponse> => {
  const { data } = await api.get<AutocompleteResponse>("/autocomplete", {
    params: { q: query },
  });
  return data;
};

/**
 * Layer 2: Product offers (full or preview)
 * @param productId Aggregated product ID
 * @param full Whether to fetch full offer data
 * @param limit Number of offers to fetch
 * @param cursor Optional cursor for pagination
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

  const { data } = await api.get(`/product/${productId}/offers`, { params });
  return data;
};

export default api;
