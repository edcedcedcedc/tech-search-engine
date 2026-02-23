// types/api.ts
import type { Offer } from './AggregatedProduct';

// Search result product (with count + empty offers array)
export interface ApiSearchProduct {
  id: string;
  name: string;
  variant?: string;
  t_name: Record<string, any>;
  t_variant: Record<string, any>;
  brand?: string;
  t_category: Record<string, any>;
  offers_count: number;  // ← This is the COUNT
  offers: [];            // ← Always empty array in search results
  lowest_price: number;
  highest_price: number;
  average_price: number;
  relevance?: number;
  product_score: number;
  image?: string;
  shops: string[];
  embedding?: string;
}

// Full search response
export interface ApiSearchResponse {
  products: ApiSearchProduct[];
  total_count: number;
  cursor?: string;
}

// Offers response (if endpoint returns just offers)
export interface ApiOffersResponse {
  offers: Offer[];
  product_id: string;
  total_count: number;
  cursor?: string;
}