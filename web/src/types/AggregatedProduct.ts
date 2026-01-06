export interface AggregatedProduct {
  id: string;             // unique aggregator product ID (can use first product id or hash)
  name: string;
  brand: string;
  category: string;
  variant: string;
  t_name: object;
  t_variant: object;
  offers: {
    shop: string;
    price: number;
    url: string;
    name:any;
    brand: any;
    variant:any;
    external_id: string;
    in_stock?: boolean;  
    t_name: object;
    t_variant: object;     //  for later availability tracking
  }[];
  lowest_price?: number;
  maximum_price?: number;
  relevance?: number;    
  image?: string;         
}