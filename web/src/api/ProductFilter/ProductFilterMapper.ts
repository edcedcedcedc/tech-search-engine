import { type ProductFilters } from "../../types/ProductFilters";

export const buildProductFilter = (filters: ProductFilters) => {
  const filter: Record<string, unknown> = {};

  if (filters.category) filter.category = filters.category;
  if (filters.brands?.length) filter.brands = filters.brands;
  if (filters.priceMin !== undefined) filter.priceMin = filters.priceMin;
  if (filters.priceMax !== undefined) filter.priceMax = filters.priceMax;
  if (filters.shop) filter.shop = filters.shop;
  if (filters.sortBy) filter.sortBy = filters.sortBy;

  return filter;
};
