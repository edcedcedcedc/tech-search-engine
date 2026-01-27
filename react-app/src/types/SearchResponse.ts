import type { AggregatedProduct } from "./AggregatedProduct";

export interface SearchResponse {
  products: AggregatedProduct[];
  next_cursor?: string | null;
}