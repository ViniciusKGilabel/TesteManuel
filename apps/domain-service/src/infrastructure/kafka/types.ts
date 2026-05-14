export interface KafkaEnvelope {
  saga_id: string;
  event_type: string;
  timestamp: string;
  payload: unknown;
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price?: number;
}

export interface OrderPlacedPayload {
  order_id: string;
  user_id: string;
  items: OrderItem[];
  total: number;
  currency: string;
}

export interface StockReleaseItem {
  product_id: string;
  quantity: number;
}

export interface StockReleaseRequestedPayload {
  order_id: string;
  items: StockReleaseItem[];
}
