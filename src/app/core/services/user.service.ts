// ============================================================
// USER SERVICE — MOCK + API-READY
//
// HOW TO UPGRADE:
//   Inject HttpClient, replace each method body with:
//   return this.http.get<ApiResponse<User>>(`${environment.apiUrl}/users/${id}`)
//     .pipe(map(r => r.data));
// ============================================================

import { Injectable } from '@angular/core';
import { User } from '../models/user.model';

// ─── MOCK DATA ─────────────────────────────────────────────────────────────
const MOCK_USERS: User[] = [
  {
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
    location: 'New York, USA',
  },
  {
    id: 'user-002',
    firstName: 'P.Rick',
    lastName: '',
    email: 'mia@example.com',
    avatar: 'https://i.pravatar.cc/150?img=5',
    role: 'user',
    rating: 4.9,
    totalSales: 57,
    totalPurchases: 3,
    joinedAt: new Date('2023-06-20'),
    isVerified: true,
    location: 'London, UK',
  },
  {
    id: 'user-003',
    firstName: 'Jay',
    lastName: 'T.',
    email: 'jay@example.com',
    avatar: 'https://i.pravatar.cc/150?img=8',
    role: 'user',
    rating: 4.7,
    totalSales: 12,
    totalPurchases: 15,
    joinedAt: new Date('2024-03-10'),
    isVerified: true,
    location: 'Tokyo, JP',
  },
];
// ──────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class UserService {
  /**
   * GET USER BY ID
   * REAL: return this.http.get<ApiResponse<User>>(
   *   `${environment.apiUrl}/users/${id}`
   * ).pipe(map(r => r.data));
   */
  getUserById(id: string): User | undefined {
    return MOCK_USERS.find(u => u.id === id);
  }

  /**
   * UPDATE PROFILE
   * REAL: return this.http.patch<ApiResponse<User>>(
   *   `${environment.apiUrl}/users/me`, payload
   * );
   */
  updateProfile(id: string, payload: Partial<User>): User | undefined {
    const user = MOCK_USERS.find(u => u.id === id);
    if (user) Object.assign(user, payload);
    return user;
  }
}
