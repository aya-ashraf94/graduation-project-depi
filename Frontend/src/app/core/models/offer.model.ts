export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered';

export interface Offer {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  counterAmount?: number;
  status: OfferStatus;
  conversationId?: string;
  expiresAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  productTitle?: string;
  orderId?: string;
}

export interface MakeOfferRequest {
  productId: string;
  amount: number;
  conversationId?: string;
}
