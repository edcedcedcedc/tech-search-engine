import { useEffect, useState } from "react";
import {
  fetchProducts,
  fetchProductsMock,
} from "../api/ProductFilter/ProductFilterHandler";
import type { Product } from "../types/Product";
import type { ProductFilters } from "../types/ProductFilters";

interface FetchProductParams {
  filters: ProductFilters;
  search: string;
}

export const useProducts = ({ filters, search }: FetchProductParams) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // const result = await fetchProducts({ filters, page, search });
        const result = await fetchProductsMock({ filters, page, search });
        if (!cancelled) {
          setProducts(result);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [page, filters, search]);

  return { products, loading, page, setPage };
};
