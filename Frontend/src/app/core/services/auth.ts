// ============================================================
// AUTH SERVICE — MOCK + API-READY
//
// HOW TO UPGRADE TO REAL BACKEND:
//   1. Inject HttpClient
//   2. Replace mock methods with:
//      this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload)
//   3. Remove MOCK_USER and MOCK_TOKEN constants
// ============================================================

import { Injectable, signal, computed } from '@angular/core';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../models/user.model';

const TOKEN_KEY = 'arch_token';
const USER_KEY = 'arch_user';

// ─── MOCK DATA (remove when backend is ready) ─────────────────────────────
const MOCK_TOKEN = 'mock-jwt-token-abc123';
const MOCK_USER: User = {
  id: 'user-001',
  firstName: 'Alex',
  lastName: 'Doe',
  email: 'alex@example.com',
  avatar: 'https://i.pravatar.cc/150?img=12',
  role: 'user',
  rating: 4.8,
  totalSales: 23,
  totalPurchases: 7,
  joinedAt: new Date('2024-01-15'),
  isVerified: true,
  location: 'The Grid',
  bio: 'Architect of digital artifacts and high-fidelity textures. Curating a collection of neo-brutalist assets for the modern web since 2018. Based in the Grid.',
  tags: ['BAUHAUS_COLLECTOR', 'CYBER_CURATOR'],
  reviewsCount: 124,
  successRate: 99,
  yearsExperience: 3,
};
// ──────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AuthService {
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
   * MOCK: accepts any email/password, returns mock user.
   * REAL: replace body with:
   *   return this.http.post<ApiResponse<AuthResponse>>(
   *     `${environment.apiUrl}/auth/login`, payload
   *   ).pipe(tap(res => this._persist(res.data.token, res.data.user)));
   */
  login(payload: LoginRequest): void {
    // -- MOCK implementation --
    const response: AuthResponse = { token: MOCK_TOKEN, user: MOCK_USER };
    this._persist(response.token, response.user);
  }

  /**
   * REGISTER
   * MOCK: immediately "creates" account and logs in.
   * REAL: replace body with HTTP POST to /auth/register
   */
  register(payload: RegisterRequest): void {
    // -- MOCK implementation --
    const newUser: User = {
      ...MOCK_USER,
      id: `user-${Date.now()}`,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      totalSales: 0,
      totalPurchases: 0,
      joinedAt: new Date(),
      isVerified: false,
    };
    this._persist(MOCK_TOKEN, newUser);
  }

  /** Logout — clears token and user from memory and storage */
  logout(): void {
    this._token.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
}
