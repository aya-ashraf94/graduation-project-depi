import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RefundRequest {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'approved' | 'rejected';
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    price: number;
    status: string;
    paymentMethod: string;
    platformFee?: number;
    fundsReleased?: boolean;
  };
  product?: {
    id: string;
    title: string;
    thumbnail: string;
  };
  buyer?: {
    id: string;
    name: string;
    email: string;
  };
}

@Injectable({ providedIn: 'root' })
export class RefundService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/refunds`;

  requestRefund(orderId: string, reason: string, details?: string): Observable<RefundRequest> {
    return this.http.post<RefundRequest>(this.apiUrl, { orderId, reason, details }, { withCredentials: true });
  }

  getMyRefundRequests(): Observable<RefundRequest[]> {
    return this.http.get<RefundRequest[]>(this.apiUrl, { withCredentials: true });
  }

  adminGetRefundRequests(): Observable<RefundRequest[]> {
    return this.http.get<RefundRequest[]>(`${this.apiUrl}/admin`, { withCredentials: true });
  }

  adminProcessRefund(id: string, status: 'approved' | 'rejected', resolution?: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/${id}`, { status, resolution }, { withCredentials: true });
  }
}