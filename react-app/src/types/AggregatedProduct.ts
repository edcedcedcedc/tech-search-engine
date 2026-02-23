// types/AggregatedProduct.ts
import type { PriceHistoryPreview, PriceTrendPreview } from "./PriceTrend";

export interface Offer {
  id: string;
  external_id?: string;
  name: string;
  variant?: string;
  t_name: Record<string, any>;
  t_variant: Record<string, any>;
  t_category: Record<string, any>;
  shop: string;
  price: number;
  url?: string;
  brand?: string;
  in_stock: boolean;
  offer_score?: number;
  price_history?: PriceHistoryPreview[];
  price_trend_preview: PriceTrendPreview;
  embedding?: string;
}

export interface AggregatedProduct {
  id: string;
  name: string;
  variant?: string;
  t_name: Record<string, any>;
  t_variant: Record<string, any>;
  brand?: string;
  t_category: Record<string, any>;
  offers: Offer[];  // Will be populated when product is opened
  offers_count: number;  // ← KEEP THIS! The count from search results
  lowest_price: number;
  highest_price: number;
  average_price: number;
  relevance?: number;
  product_score: number;
  image?: string;
  shops: string[];
  embedding?: string;
}