// src/context/ProductContext.ts
import { createContext, type Dispatch, type SetStateAction } from "react";
import type { Product } from "../types/Product";
import type { ProductFilters } from "../types/ProductFilters";

export interface ProductContextValue {
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  filters: ProductFilters;
  setFilters: Dispatch<SetStateAction<ProductFilters>>;
}

export const ProductContext = createContext<ProductContextValue | undefined>(
  undefined
);
