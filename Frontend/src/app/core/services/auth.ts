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

const TOKEN_KEY = 'nafa3ni_token';
const REFRESH_TOKEN_KEY = 'nafa3ni_refresh';
const USER_KEY = 'nafa3ni_user';

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
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');

  // ── Public methods ────────────────────────────────────────────────────────

  /**
   * LOGIN
   * Sends credentials to Backend, maps user and persists token, refreshToken & user.
   */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((res) => {
        const mappedUser = this._mapUser(res.user);
        this._persist(res.token, res.refreshToken, mappedUser);
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

  /** Logout — calls backend to revoke refresh token, then clears local session */
  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({
        error: () => {}
      });
    }
    this._clearSession();
    this.router.navigate(['/']);
  }

  /** Clear all auth state without calling backend (used by interceptor on refresh failure) */
  clearSession(): void {
    this._clearSession();
  }

  /** Get the stored refresh token (used by interceptor) */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /** Update current logged in user details locally */
  updateLocalUser(user: User): void {
    this._currentUser.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _persist(token: string, refreshToken: string, user: User): void {
    this._token.set(token);
    this._currentUser.set(user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private _clearSession(): void {
    this._token.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
    const baseUrl = environment.apiUrl.replace('/api', '');

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
      isSuspended: u.isSuspended ?? false,
      avatar: u.avatar && u.avatar.startsWith('/uploads')
        ? `${baseUrl}${u.avatar}`
        : u.avatar || `https://i.pravatar.cc/150?u=${u.email || u._id || u.id}`,
      bio: u.bio || '',
      phoneNumber: u.phoneNumber || '',
      location: u.location || '',
      governorate: u.governorate || '',
      city: u.city || '',
      district: u.district || '',
      tags: u.tags || [],
    };
  }
}
