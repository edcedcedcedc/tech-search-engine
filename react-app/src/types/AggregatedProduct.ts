import type { PriceHistoryPreview, PriceTrendPreview } from "./PriceTrend";



export interface Offer {
  id: string; // can be string if clustered
  external_id?: string;
  name: string;
  variant?: string;
  t_name: Record<string, any>; // matches JSONField
  t_variant: Record<string, any>;
  t_category: Record<string, any>;
  shop: string;
  price: number;
  url?: string;
  brand?: string;
  in_stock: boolean;
  offer_score?: number;
  price_history?: PriceHistoryPreview[];
  price_trend_preview: PriceTrendPreview
  embedding?: string; // write_only, optional
}

export interface AggregatedProduct {
  id: string; // Cluster ID
  name: string;
  variant?: string;
  t_name: Record<string, any>;
  t_variant: Record<string, any>;
  brand?: string;
  t_category: Record<string, any>;
  offers: Offer[];
  lowest_price: number;
  relevance?: number;
  product_score: number;
  image?: string;
  shops: string[];
  embedding?: string; // write_only, optional
}