// types/PriceTrend.ts

export interface PriceHistoryPreview {
  price: number;
  in_stock: boolean;
  recorded_at: string; // ISO string from backend
}

export interface PriceTrendPreview {
  free_price_trend: PriceHistoryPreview[];
  hidden_price_trend_count: number;
}