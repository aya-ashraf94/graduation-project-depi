// ============================================================
// ORDER / TRANSACTION MODELS
// Tracks purchases between buyers and sellers.
// ============================================================

import { UserSummary } from './user.model';
import { ProductSummary } from './product.model';

export type OrderStatus =
  | 'pending'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cash_on_delivery' | 'bank_transfer' | 'online';

export interface Order {
  id: string;
  product: ProductSummary;
  buyer: UserSummary;
  seller: UserSummary;
  price: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  shippingAddress?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Lightweight version for order lists */
export interface OrderSummary {
  id: string;
  productId: string;
  productTitle: string;
  productThumbnail: string;
  price: number;
  status: OrderStatus;
  counterpartyName: string;   // buyer sees seller name, seller sees buyer name
  createdAt: Date;
}

/** Payload to create a new order (buyer clicks "Buy Now") */
export interface CreateOrderRequest {
  productId: string;
  paymentMethod: PaymentMethod;
  shippingAddress?: string;
  notes?: string;
}

/** Payload to update order status (seller ships, buyer confirms, etc.) */
export interface UpdateOrderRequest {
  status?: OrderStatus;
  trackingNumber?: string;
}

/** Human-readable labels for order status */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
