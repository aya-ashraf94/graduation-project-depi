// ============================================================
// USER MODELS
// Swap the mock AuthService with real HTTP — these types stay.
// ============================================================

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: UserRole;
  rating: number;       // 0–5
  totalSales: number;
  totalPurchases: number;
  joinedAt: Date;
  isVerified: boolean;
  isSuspended?: boolean;
  trustBadge?: string | null;
  phoneNumber?: string;
  location?: string;
  governorate?: string;
  city?: string;
  district?: string;
  bio?: string;
  tags?: string[];
  reviewsCount?: number;
  successRate?: number;
  yearsExperience?: number;
}

/** Lightweight version used in product cards, chat previews, etc. */
export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  rating: number;
  isVerified: boolean;
  trustBadge?: string | null;
  successRate?: number;
  totalSales?: number;
}

/** Payload sent when registering */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/** Payload sent when logging in */
export interface LoginRequest {
  email: string;
  password: string;
}

/** What the backend returns after successful login */
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}
