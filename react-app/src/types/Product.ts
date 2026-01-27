export interface Product {
  id: string;
  external_id: string;
  name: string;
  price: number;
  brand: string;
  category: string;
  t_variant: object,
  t_name: object,
  variant: string;
  url: string;
  image?: string;
  created_at: string;
  updated_at: string;
  shop: string;
  in_stock: boolean;
}