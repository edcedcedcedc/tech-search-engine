// utils/transformers.ts
import type { AggregatedProduct } from '../types/AggregatedProduct';
import type { ApiSearchProduct } from '../types/Api';

export function transformSearchResult(apiProduct: ApiSearchProduct): AggregatedProduct {
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    variant: apiProduct.variant,
    t_name: apiProduct.t_name,
    t_variant: apiProduct.t_variant,
    brand: apiProduct.brand,
    t_category: apiProduct.t_category,
    offers: [], // Empty array - will be populated later
    offers_count: apiProduct.offers_count, // ← PRESERVE THE COUNT!
    lowest_price: apiProduct.lowest_price,
    relevance: apiProduct.relevance,
    product_score: apiProduct.product_score,
    image: apiProduct.image,
    shops: apiProduct.shops,
    embedding: apiProduct.embedding,
  };
}

// Validator to fix any cached data
export function validateAndFixCachedProduct(product: any): AggregatedProduct {
  return {
    id: product.id,
    name: product.name,
    variant: product.variant,
    t_name: product.t_name,
    t_variant: product.t_variant,
    brand: product.brand,
    t_category: product.t_category,
    // Ensure offers is an array
    offers: Array.isArray(product.offers) ? product.offers : [],
    // Ensure offers_count is a number (or try to derive it)
    offers_count: typeof product.offers_count === 'number' 
      ? product.offers_count 
      : (Array.isArray(product.offers) ? product.offers.length : 0),
    lowest_price: product.lowest_price,
    relevance: product.relevance,
    product_score: product.product_score,
    image: product.image,
    shops: product.shops,
    embedding: product.embedding,
  };
}