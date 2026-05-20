// ============================================================
// MESSAGE / CHAT MODELS
// Used by the buyer↔seller chat feature.
// ============================================================

import { UserSummary } from './user.model';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: MessageStatus;
  sentAt: Date;
}

/** A thread between two users, optionally tied to a specific product listing */
export interface Conversation {
  id: string;
  participants: [UserSummary, UserSummary]; // [buyer, seller]
  productId?: string;       // The listing being discussed (optional)
  productTitle?: string;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
}

/** Payload to send a new message */
export interface SendMessageRequest {
  conversationId: string;
  content: string;
}

/** Payload to start a new conversation (e.g. "Message Seller" button) */
export interface StartConversationRequest {
  recipientId: string;
  productId?: string;
  initialMessage: string;
}
