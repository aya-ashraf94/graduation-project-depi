import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SellerTier {
  id: string;
  name: string;
  description?: string;
  feePercent?: number;
  monthlyPrice: number;
  yearlyPrice: number;
  featuredListingsIncluded: number;
  badgeLabel?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInfo {
  subscribed: boolean;
  tier?: SellerTier;
  expiresAt?: string;
  isExpired?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TierService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tiers`;

  getTiers(): Observable<SellerTier[]> {
    return this.http.get<SellerTier[]>(this.apiUrl);
  }

  getActiveTiers(): Observable<SellerTier[]> {
    return this.http.get<SellerTier[]>(`${this.apiUrl}/active`);
  }

  subscribe(tierId: string, billingCycle: 'monthly' | 'yearly'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/subscribe`, { tierId, billingCycle }, { withCredentials: true });
  }

  getMySubscription(): Observable<SubscriptionInfo> {
    return this.http.get<SubscriptionInfo>(`${this.apiUrl}/my`, { withCredentials: true });
  }

  cancelSubscription(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/cancel`, { withCredentials: true });
  }

  // Admin
  adminCreateTier(data: Partial<SellerTier>): Observable<SellerTier> {
    return this.http.post<SellerTier>(`${this.apiUrl}/admin`, data, { withCredentials: true });
  }

  adminUpdateTier(id: string, data: Partial<SellerTier>): Observable<SellerTier> {
    return this.http.put<SellerTier>(`${this.apiUrl}/admin/${id}`, data, { withCredentials: true });
  }

  adminDeleteTier(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/admin/${id}`, { withCredentials: true });
  }
}