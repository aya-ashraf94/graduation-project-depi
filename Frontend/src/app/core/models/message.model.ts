// ============================================================
// MESSAGE / CHAT MODELS
// Used by the buyer↔seller chat feature.
// ============================================================

import { UserSummary } from './user.model';

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'offer' | 'system' | 'counter_offer';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: MessageStatus;
  type?: MessageType;
  metadata?: {
    offerId?: string;
    offerAmount?: number;
    counterAmount?: number;
    offerStatus?: 'pending' | 'accepted' | 'rejected' | 'countered';
    expiresAt?: string | Date;
  };
  sentAt: Date;
}

/** A thread between two users, optionally tied to a specific product listing */
export interface Conversation {
  id: string;
  participants: [UserSummary, UserSummary]; // [buyer, seller]
  productId?: string;       // The listing being discussed (optional)
  productTitle?: string;
  productThumbnail?: string;
  productPrice?: number;
  productOwnerId?: string;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
}

/** Payload to send a new message */
export interface SendMessageRequest {
  conversationId: string;
  content: string;
  type?: MessageType;
  metadata?: any;
}

/** Payload to start a new conversation (e.g. "Message Seller" button) */
export interface StartConversationRequest {
  recipientId: string;
  productId?: string;
  initialMessage: string;
}
