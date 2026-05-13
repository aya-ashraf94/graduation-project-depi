// ============================================================
// NOTIFICATION SERVICE — MOCK + API-READY
//
// HOW TO UPGRADE TO REAL BACKEND:
//   1. Inject HttpClient and environment
//   2. Replace mock methods with HTTP calls
//   3. Add WebSocket/SSE connection for real-time push
//      Example: connect() →
//        this.ws = new WebSocket(`${environment.wsUrl}/notifications`);
//        this.ws.onmessage = (event) => this._addNotification(JSON.parse(event.data));
// ============================================================

import { Injectable, signal, computed } from '@angular/core';
import { Notification, NotificationType } from '../models/notification.model';

// ─── MOCK DATA ─────────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    userId: 'user-001',
    type: 'order_update',
    title: 'Order Delivered',
    body: 'Your Muted Moto Jacket 2018 has been delivered!',
    isRead: false,
    linkedEntityId: 'order-001',
    linkedRoute: '/products/prod-001',
    createdAt: new Date('2025-04-18'),
  },
  {
    id: 'notif-002',
    userId: 'user-001',
    type: 'review',
    title: 'New Review',
    body: 'P.Rick left you a 4-star review.',
    isRead: true,
    linkedEntityId: 'rev-002',
    linkedRoute: '/profile/me',
    createdAt: new Date('2025-04-21'),
  },
  {
    id: 'notif-003',
    userId: 'user-001',
    type: 'message',
    title: 'New Message',
    body: 'Jay T. sent you a message about "1955 501 XX Customized".',
    isRead: false,
    linkedEntityId: 'conv-001',
    linkedRoute: '/chat',
    createdAt: new Date('2025-05-10'),
  },
];
// ──────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>(MOCK_NOTIFICATIONS);

  /** Reactive count of unread notifications (for badge display) */
  readonly unreadCount = computed(
    () => this._notifications().filter(n => !n.isRead).length
  );

  // ── Read methods ────────────────────────────────────────────────────────

  /**
   * GET NOTIFICATIONS FOR USER
   * REAL: return this.http.get<PaginatedResponse<Notification>>(
   *   `${environment.apiUrl}/notifications`
   * );
   */
  getNotifications(userId: string): Notification[] {
    return this._notifications()
      .filter(n => n.userId === userId)
      .sort((a, b) => +b.createdAt - +a.createdAt);
  }

  /** Get only unread notifications */
  getUnread(userId: string): Notification[] {
    return this.getNotifications(userId).filter(n => !n.isRead);
  }

  // ── Write methods ────────────────────────────────────────────────────────

  /**
   * MARK AS READ
   * REAL: return this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {});
   */
  markAsRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  /**
   * MARK ALL AS READ
   * REAL: return this.http.post(`${environment.apiUrl}/notifications/read-all`, {});
   */
  markAllAsRead(userId: string): void {
    this._notifications.update(list =>
      list.map(n => (n.userId === userId ? { ...n, isRead: true } : n))
    );
  }

  /**
   * ADD NOTIFICATION (used internally or from WebSocket push)
   */
  addNotification(notification: Notification): void {
    this._notifications.update(list => [notification, ...list]);
  }

  /**
   * DELETE NOTIFICATION
   * REAL: return this.http.delete(`${environment.apiUrl}/notifications/${id}`);
   */
  deleteNotification(id: string): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
  }
}
