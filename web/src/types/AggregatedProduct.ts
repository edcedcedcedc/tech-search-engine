export interface AggregatedProduct {
  id: string;             // unique aggregator product ID (can use first product id or hash)
  name: string;
  brand: string;
  category: string;
  variant: string;
  offers: {
    shop: string;
    price: number;
    url: string;
    name:any;
    brand: any;
    variant:any;
    external_id: string;
    stock?: boolean;       // optional for later availability tracking
  }[];
  lowest_price?: number;
  maximum_price?: number;    // cached to sort frontend quickly
  image?: string;          // optional product image
}