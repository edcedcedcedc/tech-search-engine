import { ProductFilterApi } from "./ProductFilterApi";
import { PRODUCTS_QUERY } from "../../mocks/ProductFilter";
import { buildProductFilter } from "./ProductFilterMapper";
import { type Product } from "../../types/Product";
import { type ProductFilters } from "../../types/ProductFilters";
import { mockProducts } from "../../mocks/product";

interface ProductsResponse {
  products: Product[];
}

interface FetchProductParams {
  filters: ProductFilters;
  page?: number;
  limit?: number;
  search?: string;
}

// TODO: if search and filters are empty then return top products from backend
export const fetchProducts = async ({
  filters,
  page = 1,
  limit = 20,
  search = "",
}: FetchProductParams): Promise<Product[]> => {
  const response = await ProductFilterApi.post<{
    data: ProductsResponse;
    errors?: { message: string }[];
  }>("", {
    query: PRODUCTS_QUERY,
    variables: {
      filter: buildProductFilter(filters),
      page,
      limit,
      search,
    },
  });

  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0].message);
  }

  return response.data.data.products;
};

// TODO: remove in future
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const fetchProductsMock = async ({
  filters,
  page = 1,
  limit = 20,
  search = "",
}: FetchProductParams): Promise<Product[]> => {
  const delayT = 100 + Math.random() * 500;
  await delay(delayT);

  let result = [...mockProducts];

  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    result = result.filter((p) => p.category === filters.category);
  }

  if (filters.brands?.length) {
    result = result.filter((p) => filters.brands!.includes(p.brand));
  }

  if (filters.shop) {
    result = result.filter((p) => p.shop === filters.shop);
  }

  if (filters.priceMin !== undefined) {
    result = result.filter((p) => p.price >= filters.priceMin!);
  }

  if (filters.priceMax !== undefined) {
    result = result.filter((p) => p.price <= filters.priceMax!);
  }

  const start = (page - 1) * limit;
  const end = start + limit;

  return result.slice(start, end);
};
