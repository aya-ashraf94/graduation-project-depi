import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth/user`;

  /** GET USER BY ID from backend */
  getUserById(id: string): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(u => this.mapUser(u))
    );
  }

  /** UPDATE PROFILE */
  updateProfile(id: string, payload: any): Observable<User> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(u => this.mapUser(u))
    );
  }

  private mapUser(u: any): User {
    if (!u) return u;
    const nameParts = (u.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'USER';
    const lastName = nameParts.slice(1).join(' ') || '';
    return {
      id: u._id || u.id,
      firstName,
      lastName,
      email: u.email || '',
      avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.email || u._id}`,
      role: u.role || 'user',
      rating: u.rating ?? 5.0,
      totalSales: u.totalSales ?? 0,
      totalPurchases: u.totalPurchases ?? 0,
      joinedAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      isVerified: u.isVerified ?? false,
      location: u.location || 'Cairo',
      bio: u.bio || '',
      tags: u.tags || []
    };
  }
}
