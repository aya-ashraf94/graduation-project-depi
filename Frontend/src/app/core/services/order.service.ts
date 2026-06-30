import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Order,
  OrderSummary,
  CreateOrderRequest,
  UpdateOrderRequest,
} from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/orders`;

  /** GET ALL ORDERS FOR CURRENT USER (purchases and sales) */
  getOrders(): Observable<OrderSummary[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(orders => {
        const currentUser = JSON.parse(localStorage.getItem('nafa3ni_user') || '{}');
        const currentUserId = currentUser.id || currentUser._id;
        
        return orders.map(o => {
          const isBuyer = o.buyer?.id === currentUserId;
          const counterpartyName = isBuyer 
            ? `${o.seller?.firstName || ''} ${o.seller?.lastName || ''}`.trim()
            : `${o.buyer?.firstName || ''} ${o.buyer?.lastName || ''}`.trim();
            
          return {
            id: o.id,
            productId: o.product?.id || '',
            productTitle: o.product?.title || '',
            productThumbnail: o.product?.thumbnail || '',
            price: o.price,
            status: o.status,
            counterpartyName: counterpartyName || 'Unknown',
            createdAt: o.createdAt,
            buyerId: o.buyer?.id,
            sellerId: o.seller?.id,
            paymentMethod: o.paymentMethod,
            shippingAddress: o.shippingAddress,
            notes: o.notes,
            trackingNumber: o.trackingNumber,
            updatedAt: o.updatedAt
          } as unknown as OrderSummary;
        });
      })
    );
  }

  /** GET ORDER BY ID */
  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }

  /** CREATE ORDER */
  createOrder(payload: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, payload);
  }

  /** UPDATE ORDER STATUS */
  updateOrder(id: string, payload: UpdateOrderRequest): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${id}`, payload);
  }

  /** VALIDATE DISCOUNT COUPON */
  validateCoupon(code: string, productId: string): Observable<{
    valid: boolean;
    discountAmount: number;
    finalPrice: number;
    discountType: string;
    discountValue: number;
  }> {
    return this.http.post<any>(`${this.apiUrl}/validate-coupon`, { code, productId });
  }

  /** GET RANDOM ACTIVE COUPON FOR SCRATCH CARD GAME */
  getScratchCoupon(): Observable<{
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    expiryDate?: string;
  }> {
    return this.http.get<any>(`${this.apiUrl}/scratch/get-coupon`);
  }
}
