export interface Product {
    id: number;
    external_id: string;
    name: string;
    price: number;
    brand: string;
    category: string;
    variant?: string;
    url: string;
    image?: string;
    shop: string;
}
