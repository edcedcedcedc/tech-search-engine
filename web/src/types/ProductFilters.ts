export type SortingOptions = "PRICE_LOW_TO_HIGH" | "PRICE_HIGH_TO_LOW";
// | "POPULAR_LOW_TO_HIGH"
// | "POPULAR_HIGH_TO_LOW";

export interface ProductFilters {
  category?: string;
  brands?: string[];
  priceMin?: number;
  priceMax?: number;
  shop?: string;
  sortBy?: SortingOptions;
}
