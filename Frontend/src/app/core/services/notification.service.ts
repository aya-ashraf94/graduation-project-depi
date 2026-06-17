// ============================================================
// NOTIFICATION SERVICE — REAL BACKEND INTEGRATION
// ============================================================

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly _notifications = signal<Notification[]>([]);

  /** Reactive count of unread notifications (for badge display) */
  readonly unreadCount = computed(
    () => this._notifications().filter(n => !n.isRead).length
  );

  constructor() {
    // Automatically synchronize notifications when logged-in state changes
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.fetchNotifications();
      } else {
        this._notifications.set([]);
      }
    });
  }

  /** Fetch notifications from backend */
  fetchNotifications(): void {
    this.http.get<Notification[]>(`${environment.apiUrl}/notifications`).subscribe({
      next: (list) => {
        this._notifications.set(list);
      },
      error: (err) => {
        console.error('Error fetching notifications:', err);
      }
    });
  }

  // ── Read methods ────────────────────────────────────────────────────────

  /** Get notifications (ignoring parameter, returns user's notifications sorted) */
  getNotifications(userId?: string): Notification[] {
    return [...this._notifications()]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  /** Get only unread notifications */
  getUnread(userId?: string): Notification[] {
    return this.getNotifications(userId).filter(n => !n.isRead);
  }

  // ── Write methods ────────────────────────────────────────────────────────

  /**
   * MARK AS READ (Optimistic UI Update)
   */
  markAsRead(id: string): void {
    // Optimistically mark as read in local state
    this._notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );

    // Sync with backend API
    this.http.patch<any>(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      error: (err) => {
        console.error('Error marking notification as read on backend:', err);
      }
    });
  }

  /**
   * MARK ALL AS READ (Optimistic UI Update)
   */
  markAllAsRead(userId?: string): void {
    // Also mark locally right away for instant UI feedback
    this._notifications.update(list =>
      list.map(n => ({ ...n, isRead: true }))
    );

    // Sync with backend API, then re-fetch to guarantee consistency
    this.http.post<any>(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => this.fetchNotifications(),
      error: (err) => {
        console.error('Error marking all notifications as read on backend:', err);
        // Re-fetch to revert optimistic state to real server state
        this.fetchNotifications();
      }
    });
  }

  /**
   * ADD NOTIFICATION (used internally or from WebSocket push)
   */
  addNotification(notification: Notification): void {
    this._notifications.update(list => [notification, ...list]);
  }

  /**
   * DELETE NOTIFICATION (Optimistic UI Update)
   */
  deleteNotification(id: string): void {
    const backup = this._notifications();

    // Optimistically remove from state
    this._notifications.update(list => list.filter(n => n.id !== id));

    // Sync with backend API
    this.http.delete<any>(`${environment.apiUrl}/notifications/${id}`).subscribe({
      error: (err) => {
        console.error('Error deleting notification on backend:', err);
        // Rollback state on error
        this._notifications.set(backup);
      }
    });
  }
}
