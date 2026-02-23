import axios from "axios";
import { uiLog } from "../webhook/client/uiDebug"; // <-- import logger
// ---------------- Types ----------------
import type { AggregatedProduct } from "../types/AggregatedProduct";
/* import type { SearchResponse } from "../types/SearchResponse"; */
import type { AutocompleteResponse } from "../types/AutocompleteResponse";
import type { ApiSearchResponse } from '../types/Api';


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
  offset?: number,
  options?: { signal?: AbortSignal } 
): Promise<ApiSearchResponse> => {
  const params: Record<string, any> = { q: query };
  if (lang) params.lang = lang;
  if (limit) params.limit = limit;

  if (cursor !== undefined) {
    params.cursor = cursor;
  } else if (offset !== undefined) {
    params.cursor = offset.toString();
  }

  uiLog(`[API] searchProducts | REQUEST | query=${query} | lang=${lang} | limit=${limit} | cursor=${params.cursor}`);

  try {
    // Change this line from SearchResponse to ApiSearchResponse
    const { data } = await api.get<ApiSearchResponse>("/search/", { params, signal: options?.signal });
    
    // Log response summary
    uiLog(`[API] searchProducts | RESPONSE SUCCESS | query=${query} | results=${data.products.length} | total_count=${data.total_count}`);
    
    // Log first few product IDs for debugging
    if (data.products.length > 0) {
      uiLog(`[API] searchProducts | FIRST 3 PRODUCT IDs | ${data.products.slice(0, 3).map(p => p.id).join(', ')}`);
    }
    
    return data;
  } catch (err: any) {
    const status = err?.response?.status;
    
    uiLog(`[API] searchProducts | ERROR | query=${query} | status=${status} | message=${err?.message}`);
    
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
 
    throw err;
  }
};

/**
 * Layer 2: Product offers (full or preview)
 */
export const getProductOffers = async (
  productId: string,
  full = true,
  query: string,
  limit?: number,
  cursor?: string,
  retry429 = 0,
  retry500 = 0,
  options?: { signal?: AbortSignal } 
 
): Promise<{
  offers: AggregatedProduct["offers"];
  has_more: boolean;
  next_cursor?: string;
}> => {
  const params: Record<string, any> = { full };
  if (limit) params.limit = limit;
  if (cursor) params.cursor = cursor;
  if (query) params.query = query;

  uiLog(`[API] getProductOffers | REQUEST | productId=${productId} | full=${full} | query="${query}" | limit=${limit} | cursor=${cursor} | retry429=${retry429} | retry500=${retry500}`);

  try {
    const res = await api.get(`/product/${productId}/offers/`, {
      params,
      signal: options?.signal
    });

    const data = res?.data ?? {};
    
    // Log full response structure
    uiLog(`[API] getProductOffers | RESPONSE RECEIVED | productId=${productId} | status=${res.status}`);
    uiLog(`[API] getProductOffers | RESPONSE SUMMARY | productId=${productId} | offersCount=${data.offers?.length || 0} | has_more=${data.has_more} | next_cursor=${data.next_cursor}`);

    // Detailed logging for first offer to track price_history and price_trend_preview
    if (data.offers && data.offers.length > 0) {
      const firstOffer = data.offers[0];
      
      uiLog(`[API] getProductOffers | FIRST OFFER DETAIL | productId=${productId} | offerId=${firstOffer.id} | shop=${firstOffer.shop} | price=${firstOffer.price}`);
      
      // Log price_history details
      if (firstOffer.price_history && firstOffer.price_history.length > 0) {
        uiLog(`[API] getProductOffers | PRICE_HISTORY | productId=${productId} | offerId=${firstOffer.id} | length=${firstOffer.price_history.length}`);
        uiLog(`[API] getProductOffers | PRICE_HISTORY LATEST | productId=${productId} | price=${firstOffer.price_history[0].price} | recorded_at=${firstOffer.price_history[0].recorded_at}`);
        uiLog(`[API] getProductOffers | PRICE_HISTORY OLDEST | productId=${productId} | price=${firstOffer.price_history[firstOffer.price_history.length-1].price} | recorded_at=${firstOffer.price_history[firstOffer.price_history.length-1].recorded_at}`);
      } else {
        uiLog(`[API] getProductOffers | PRICE_HISTORY MISSING | productId=${productId} | offerId=${firstOffer.id}`);
      }
      
      // Log price_trend_preview details
      if (firstOffer.price_trend_preview) {
        uiLog(`[API] getProductOffers | PRICE_TREND_PREVIEW | productId=${productId} | offerId=${firstOffer.id} | free_trend_length=${firstOffer.price_trend_preview.free_price_trend?.length || 0} | hidden_count=${firstOffer.price_trend_preview.hidden_price_trend_count}`);
        
        if (firstOffer.price_trend_preview.free_price_trend?.length > 0) {
          const trend = firstOffer.price_trend_preview.free_price_trend;
          uiLog(`[API] getProductOffers | TREND LATEST | productId=${productId} | price=${trend[0].price} | recorded_at=${trend[0].recorded_at}`);
          uiLog(`[API] getProductOffers | TREND OLDEST | productId=${productId} | price=${trend[trend.length-1].price} | recorded_at=${trend[trend.length-1].recorded_at}`);
        }
      } else {
        uiLog(`[API] getProductOffers | PRICE_TREND_PREVIEW MISSING | productId=${productId} | offerId=${firstOffer.id}`);
      }
      
      // If there are multiple offers, log a sample of the second one too
      if (data.offers.length > 1) {
        const secondOffer = data.offers[1];
        uiLog(`[API] getProductOffers | SECOND OFFER | productId=${productId} | offerId=${secondOffer.id} | shop=${secondOffer.shop} | price=${secondOffer.price} | price_history_length=${secondOffer.price_history?.length || 0}`);
      }
    } else {
      uiLog(`[API] getProductOffers | NO OFFERS RETURNED | productId=${productId}`);
    }

    return {
      offers: Array.isArray(data.offers) ? data.offers : [],
      has_more: Boolean(data.has_more),
      next_cursor: data.next_cursor,
    };
  } catch (err: any) {
    const status = err?.response?.status;
    
    uiLog(`[API] getProductOffers | ERROR | productId=${productId} | status=${status} | message=${err?.message} | code=${err?.code}`);

    if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
      uiLog(`[API] getProductOffers | ABORTED | productId=${productId}`);
      const e = new Error("");
      (e as any).code = 0
      throw e;
    }
    
    if (status === 403) {
      uiLog(`[API] getProductOffers | SESSION_EXPIRED | productId=${productId}`);
      const e = new Error("");
      (e as any).code = 403;
      throw e;
    } 

    if (status === 404) {
      uiLog(`[API] getProductOffers | NOT_FOUND | productId=${productId}`);
      const e = new Error("");
      (e as any).code = 403;
      throw e;
    } 

    if (status === 429 && retry429 < 3) {
      uiLog(`[API] getProductOffers | RATE_LIMITED | productId=${productId} | retry=${retry429 + 1}/3 | waiting 5s`);
      await new Promise((r) => setTimeout(r, 5000));
      return getProductOffers(productId, full, query, limit, cursor, retry429 + 1, retry500, options);
    }

    if(retry429 >= 2){
      uiLog(`[API] getProductOffers | RATE_LIMIT_EXCEEDED | productId=${productId} | max retries reached`);
      retry429 = 0
      const e = new Error("");
      (e as any).code = 429;
      throw e;
    }

    if (status === 500 && retry500 < 3) {
      uiLog(`[API] getProductOffers | SERVER_ERROR | productId=${productId} | retry=${retry500 + 1}/3 | waiting ${1000 * (retry500 + 1)}ms`);
      await new Promise((r) => setTimeout(r, 1000 * (retry500 + 1)));
      return getProductOffers(productId, full, query, limit, cursor, retry429, retry500 + 1, options);
    }

    if(retry500 >= 2){
      uiLog(`[API] getProductOffers | SERVER_ERROR_EXCEEDED | productId=${productId} | max retries reached`);
      retry500 = 0
      const e = new Error("");
      (e as any).code = 500;
      throw e;
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

  uiLog(`[API] autocomplete | REQUEST | query=${query} | lang=${lang}`);

  try {
    const { data } = await api.get<AutocompleteResponse>("/autocomplete/", { params, timeout: 5000 });
    uiLog(`[API] autocomplete | RESPONSE | query=${query} | suggestions=${data.suggestions.length}`);
    if (data.suggestions.length > 0) {
      uiLog(`[API] autocomplete | FIRST 3 SUGGESTIONS | ${data.suggestions.slice(0, 3).join(', ')}`);
    }
    return data;
  } catch (err) {
    uiLog(`[API] autocomplete | ERROR | query=${query} | err=${(err as any)?.message}`);
    throw err;
  }
};


/**
 * Fetch the current global system version from backend
 */
export const getSystemVersion = async (): Promise<{ version: number }> => {
  uiLog(`[API] getSystemVersion | REQUEST`);

  try {
    const { data } = await api.get<{ version: number }>("/system/version/");
    uiLog(`[API] getSystemVersion | RESPONSE | version=${data.version}`);
    return data;
  } catch (err: any) {
    uiLog(`[API] getSystemVersion | ERROR | err=${err?.message}`);
    
    if (err.response?.status === 403) {
      const e = new Error("SESSION_EXPIRED");
      (e as any).code = 403;
      throw e;
    }

    if (err.code === "ERR_NETWORK") {
      const e = new Error("NETWORK_ERROR");
      (e as any).code = "NETWORK_ERROR";
      throw e;
    }

    throw err;
  }
};


/**
 * Collect email for newsletter/waitlist
 */
export const collectEmail = async (email: string): Promise<{ success: boolean; message?: string }> => {
  uiLog(`[API] collectEmail | REQUEST | email=${email}`);

  try {
    const { data, status } = await api.post<{ success: boolean; message?: string }>("/email/", { email });
    uiLog(`[API] collectEmail | RESPONSE | status=${status} | data= ${data}`);
    
    // 201 means success! Return success true
    return { 
      success: true, 
      message: data.message || "Successfully subscribed!" 
    };
    
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.message || err?.message;
    
    uiLog(`[API] collectEmail | ERROR | email=${email} | status=${status} | message=${message}`);
    
    // Only return error for non-2xx responses
    return { 
      success: false, 
      message: message || "Failed to subscribe. Please try again." 
    };
  }
};



// Add this to your searchApi.ts file

/**
 * Compare products with AI-powered trend analysis
 */
export interface ComparisonRequest {
  offers: AggregatedProduct["offers"][number][]; // Array of offer objects
  tier?: 'free' | 'premium';
  lang?: 'en' | 'ro' | 'ru';
  user_text?: string;
}

export interface ExpertInsights {
  pros?: string[];
  cons?: string[];
  average_rating?: string;
  review_count?: number;
  [key: string]: any;
}

export interface ComparisonResponse {
  success: boolean;
  cached: boolean;
  analysis: {
    summary: string;
    recommendation: string;
    trend_analysis: Record<string, {
      trend: string;
      change: number;
      change_percent: number;
      volatility: number | string;
      momentum: number | string;
      best_time: string;
      in_stock: boolean;
      risk: string;
      recommendation: string;
      expert_rating?: string;
      review_summary?: string;
    }>;
    spec_comparison: Array<{
      spec: string;
      [key: string]: any; // Dynamic product fields
      advantage?: string;
    }>;
    expert_insights?: Record<string, ExpertInsights>;
    expert_consensus?: string;
    known_issues?: string[];
    alternatives_suggested?: string[];
    best_choice: string;
    analysis_tier: 'free' | 'premium';
    language: string;
    user_text_used: boolean;
    analyzed_at: string;
  };
}

/**
 * Compare products using AI trend analysis with extended timeout
 * AI analysis can take 60-120 seconds for complex comparisons
 */
export const compareProducts = async (
  request: ComparisonRequest
): Promise<ComparisonResponse> => {
  const { offers, tier = 'free', lang = 'en', user_text = '' } = request;

  uiLog(`[API] compareProducts | REQUEST | offers=${offers.length} | tier=${tier} | lang=${lang} | user_text="${user_text}"`);

  // Create an AbortController for timeout
  const controller = new AbortController();
  
  // Set timeout between 60-120 seconds (randomized to avoid thundering herd)
  const timeoutMs = Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000; // 60-120s
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data } = await api.post<ComparisonResponse>(
      "/compare/", 
      {
        offers,
        tier,
        lang,
        user_text
      },
      {
        signal: controller.signal,
        timeout: 120000, // Also set axios timeout
      }
    );

    // Clear timeout on success
    clearTimeout(timeoutId);

    uiLog(`[API] compareProducts | RESPONSE SUCCESS | cached=${data.cached} | best_choice=${data.analysis.best_choice} | time=${timeoutMs}ms`);
    
    // Log new fields if present
    if (data.analysis.expert_consensus) {
      uiLog(`[API] compareProducts | expert_consensus="${data.analysis.expert_consensus.substring(0, 50)}..."`);
    }
    if (data.analysis.known_issues?.length) {
      uiLog(`[API] compareProducts | known_issues=${data.analysis.known_issues.length}`);
    }
    if (data.analysis.alternatives_suggested?.length) {
      uiLog(`[API] compareProducts | alternatives=${data.analysis.alternatives_suggested.length}`);
    }
    
    return data;

  } catch (err: any) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    const status = err?.response?.status;
    
    // Handle abort/timeout specifically
    if (err.code === 'ERR_CANCELED' || err.name === 'AbortError' || err.code === 'ECONNABORTED') {
      uiLog(`[API] compareProducts | TIMEOUT | Request aborted after ${timeoutMs}ms`);
      const e = new Error("COMPARISON_TIMEOUT");
      (e as any).code = 408; // Request Timeout
      throw e;
    }

    uiLog(`[API] compareProducts | ERROR | status=${status} | message=${err?.message} | time=${timeoutMs}ms`);

    if (status === 400) {
      const e = new Error("INVALID_REQUEST");
      (e as any).code = 400;
      throw e;
    }

    if (status === 429) {
      const e = new Error("RATE_LIMITED");
      (e as any).code = 429;
      throw e;
    }

    if (err.code === "ERR_NETWORK") {
      const e = new Error("NETWORK_ERROR");
      (e as any).code = "NETWORK_ERROR";
      throw e;
    }

    throw err;
  }
};


/**
 * Get crawler status
 */
export const getCrawlerStatus = async (): Promise<{
  status: string;
  created?: number;
  updated?: number;
  total?: number;
  finished_at?: string;
  system_version?: number;
}> => {
  uiLog(`[API] getCrawlerStatus | REQUEST`);

  try {
    const { data } = await api.get("/system/crawler-status/");
    uiLog(
      `[API] getCrawlerStatus | RESPONSE | status=${data.status} | version=${data.system_version}`
    );
    return data;
  } catch (err: any) {
    uiLog(`[API] getCrawlerStatus | ERROR | ${err?.message}`);
    throw err;
  }
};