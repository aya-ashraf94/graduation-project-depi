import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Transaction {
  id: string;
  productTitle: string;
  productThumbnail: string;
  amount: number;
  platformFee: number;
  netEarnings: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  type?: 'order' | 'subscription' | 'refund' | 'promotion';
}

export interface WalletStats {
  balance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  totalCodFeesDeducted: number;
  recentTransactions: Transaction[];
}

export interface PayoutRequest {
  id: string;
  sellerId: string;
  sellerName?: string;
  sellerEmail?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  paymentMethod: string;
  paymentDetails: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payouts`;

  getWalletStats(): Observable<WalletStats> {
    return this.http.get<WalletStats>(`${this.apiUrl}/stats`, { withCredentials: true });
  }

  getPayouts(): Observable<PayoutRequest[]> {
    return this.http.get<PayoutRequest[]>(`${this.apiUrl}`, { withCredentials: true });
  }

  requestPayout(amount: number, paymentMethod: string, paymentDetails: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, { amount, paymentMethod, paymentDetails }, { withCredentials: true });
  }

  adminGetPayouts(): Observable<PayoutRequest[]> {
    return this.http.get<PayoutRequest[]>(`${this.apiUrl}/admin`, { withCredentials: true });
  }

  adminUpdatePayout(id: string, status: 'approved' | 'rejected'): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/${id}`, { status }, { withCredentials: true });
  }

  getAutoPayoutSettings(): Observable<{ autoPayoutDays: number; enabled: boolean }> {
    return this.http.get<{ autoPayoutDays: number; enabled: boolean }>(`${environment.apiUrl}/admin/auto-payout`, { withCredentials: true });
  }

  updateAutoPayoutSettings(days: number): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/admin/auto-payout`, { days }, { withCredentials: true });
  }

  processAutoPayouts(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/admin/auto-payout/process`, {}, { withCredentials: true });
  }
}
