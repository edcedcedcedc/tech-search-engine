import type { AggregatedProduct } from "./AggregatedProduct";

export interface SearchResponse {
  products: AggregatedProduct[];
  next_cursor: string | null;
  total_count: number; // Now this is provided by backend
  limit: number;
  offset: number;
}