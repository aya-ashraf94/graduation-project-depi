// ============================================================
// AUTH SERVICE — REAL BACKEND
//
// Connected to the Express REST API endpoints for login/register.
// ============================================================

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../models/user.model';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'arch_token';
const USER_KEY = 'arch_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // ── State ────────────────────────────────────────────────────────────────
  private readonly _token = signal<string | null>(this._loadToken());
  private readonly _currentUser = signal<User | null>(this._loadUser());

  // ── Public computed selectors ────────────────────────────────────────────
  readonly isLoggedIn = computed(() => !!this._token());
  readonly currentUser = computed(() => this._currentUser());
  readonly token = computed(() => this._token());

  // ── Public methods ────────────────────────────────────────────────────────

  /**
   * LOGIN
   * Sends credentials to Backend, maps user and persists token & user.
   */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((res) => {
        const mappedUser = this._mapUser(res.user);
        this._persist(res.token, mappedUser);
      })
    );
  }

  /**
   * REGISTER
   * Sends details to Backend, then automatically logs the user in.
   */
  register(payload: RegisterRequest): Observable<AuthResponse> {
    const backendPayload = {
      name: `${payload.firstName} ${payload.lastName}`.trim(),
      email: payload.email,
      password: payload.password,
    };
    return this.http.post<{ message: string; user: any }>(`${environment.apiUrl}/auth/register`, backendPayload).pipe(
      switchMap(() => this.login({ email: payload.email, password: payload.password }))
    );
  }

  /** Request password reset token */
  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  /** Reset password using token */
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  /** Validate password reset token */
  validateResetToken(token: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/validate-reset-token`, { token });
  }

  /** Logout — clears token and user from memory and storage, and redirects to home */
  logout(): void {
    this._token.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/']);
  }

  /** Update current logged in user details locally */
  updateLocalUser(user: User): void {
    this._currentUser.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _persist(token: string, user: User): void {
    this._token.set(token);
    this._currentUser.set(user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private _loadToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private _loadUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  /** Maps backend User schema fields to Frontend model specifications */
  private _mapUser(u: any): User {
    if (!u) return u;

    // Split single "name" string into "firstName" and "lastName"
    const nameParts = (u.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      id: u._id || u.id,
      firstName,
      lastName,
      email: u.email,
      role: u.role || 'user',
      rating: u.rating ?? 5.0,
      totalSales: u.totalSales ?? 0,
      totalPurchases: u.totalPurchases ?? 0,
      joinedAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      isVerified: u.isVerified ?? false,
      avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.email}`,
      bio: u.bio || '',
      location: u.location || '',
      tags: u.tags || [],
    };
  }
}
