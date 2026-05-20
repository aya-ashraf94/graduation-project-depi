// ============================================================
// NOTIFICATION MODELS
// In-app notifications for orders, messages, reviews, etc.
// ============================================================

export type NotificationType =
  | 'message'
  | 'order_update'
  | 'review'
  | 'listing_sold'
  | 'price_drop'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  linkedEntityId?: string;  // productId, orderId, conversationId, etc.
  linkedRoute?: string;     // e.g. '/products/prod-001', '/chat'
  createdAt: Date;
}
