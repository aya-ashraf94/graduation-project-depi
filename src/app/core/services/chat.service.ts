// ============================================================
// CHAT SERVICE — MOCK + API-READY
//
// HOW TO UPGRADE:
//   - Replace each method with an HttpClient call
//   - For real-time, add a WebSocket connection in constructor
// ============================================================

import { Injectable, signal } from '@angular/core';
import {
  Conversation,
  Message,
  SendMessageRequest,
  StartConversationRequest,
} from '../models/message.model';

// ─── MOCK DATA ─────────────────────────────────────────────────────────────
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-001',
    participants: [
      { id: 'user-001', firstName: 'Alex', lastName: 'Doe', rating: 4.8, isVerified: true },
      { id: 'user-002', firstName: 'Mia', lastName: 'K.', rating: 4.9, isVerified: true },
    ],
    productId: 'prod-001',
    productTitle: 'Muted Moto Jacket 2018',
    lastMessage: {
      id: 'msg-003',
      conversationId: 'conv-001',
      senderId: 'user-002',
      content: 'Happy to ship next day!',
      status: 'delivered',
      sentAt: new Date('2025-05-12T18:30:00'),
    },
    unreadCount: 1,
    updatedAt: new Date('2025-05-12T18:30:00'),
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-001',
    conversationId: 'conv-001',
    senderId: 'user-001',
    content: 'Hey, is this still available?',
    status: 'read',
    sentAt: new Date('2025-05-12T17:00:00'),
  },
  {
    id: 'msg-002',
    conversationId: 'conv-001',
    senderId: 'user-002',
    content: 'Yes! Still available. Any questions?',
    status: 'read',
    sentAt: new Date('2025-05-12T17:15:00'),
  },
  {
    id: 'msg-003',
    conversationId: 'conv-001',
    senderId: 'user-002',
    content: 'Happy to ship next day!',
    status: 'delivered',
    sentAt: new Date('2025-05-12T18:30:00'),
  },
];
// ──────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChatService {
  private _conversations = signal<Conversation[]>(MOCK_CONVERSATIONS);
  private _messages = signal<Message[]>(MOCK_MESSAGES);

  /**
   * GET CONVERSATIONS for the current user
   * REAL: return this.http.get<ApiResponse<Conversation[]>>(
   *   `${environment.apiUrl}/conversations`
   * ).pipe(map(r => r.data));
   */
  getConversations(): Conversation[] {
    return this._conversations();
  }

  /**
   * GET MESSAGES for a conversation
   * REAL: return this.http.get<ApiResponse<Message[]>>(
   *   `${environment.apiUrl}/conversations/${conversationId}/messages`
   * ).pipe(map(r => r.data));
   */
  getMessages(conversationId: string): Message[] {
    return this._messages().filter(m => m.conversationId === conversationId);
  }

  /**
   * SEND A MESSAGE
   * REAL: return this.http.post<ApiResponse<Message>>(
   *   `${environment.apiUrl}/messages`, payload
   * );
   */
  sendMessage(payload: SendMessageRequest, senderId: string): Message {
    const msg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: payload.conversationId,
      senderId,
      content: payload.content,
      status: 'sent',
      sentAt: new Date(),
    };
    this._messages.update(list => [...list, msg]);
    this._conversations.update(list =>
      list.map(c =>
        c.id === payload.conversationId
          ? { ...c, lastMessage: msg, updatedAt: new Date() }
          : c
      )
    );
    return msg;
  }

  /**
   * START A NEW CONVERSATION
   * REAL: return this.http.post<ApiResponse<Conversation>>(
   *   `${environment.apiUrl}/conversations`, payload
   * );
   */
  startConversation(payload: StartConversationRequest, currentUserId: string): string {
    const convId = `conv-${Date.now()}`;
    // Mock: just return the new conversation id
    return convId;
  }

  /** Mark all messages in a conversation as read */
  markAsRead(conversationId: string): void {
    this._conversations.update(list =>
      list.map(c =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    );
  }

  /** Total unread count badge for the nav */
  getTotalUnread(): number {
    return this._conversations().reduce((sum, c) => sum + c.unreadCount, 0);
  }
}
