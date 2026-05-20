// ============================================================
// ORDER SERVICE — MOCK + API-READY
//
// HOW TO UPGRADE TO REAL BACKEND:
//   1. Inject HttpClient and environment
//   2. Replace each method body with an HttpClient call
//      Example: getOrdersByUser(userId) →
//        return this.http.get<PaginatedResponse<OrderSummary>>(
//          `${environment.apiUrl}/orders`, { params: { userId } }
//        );
// ============================================================

import { Injectable, signal } from '@angular/core';
import {
  Order,
  OrderSummary,
  OrderStatus,
  CreateOrderRequest,
  UpdateOrderRequest,
} from '../models/order.model';

// ─── MOCK DATA (replace with HTTP calls when backend is ready) ─────────────
const MOCK_ORDERS: Order[] = [
  {
    id: 'order-001',
    product: {
      id: 'prod-001',
      title: 'Muted Moto Jacket 2018',
      brand: 'ACNE STUDIOS',
      price: 850,
      condition: 'excellent',
      conditionScore: 9.0,
      category: 'outerwear',
      thumbnail: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=800&auto=format&fit=crop',
      status: 'sold',
      sellerId: 'user-002',
      createdAt: new Date('2025-04-10'),
    },
    buyer: { id: 'user-001', firstName: 'Alex', lastName: 'Doe', rating: 4.8, isVerified: true },
    seller: { id: 'user-002', firstName: 'P.Rick', lastName: '', rating: 4.9, isVerified: true },
    price: 850,
    status: 'delivered',
    paymentMethod: 'online',
    shippingAddress: '123 Campus Dr, University District',
    createdAt: new Date('2025-04-12'),
    updatedAt: new Date('2025-04-18'),
  },
];
// ──────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly _orders = signal<Order[]>(MOCK_ORDERS);

  // ── Read methods ────────────────────────────────────────────────────────

  /**
   * GET ORDERS BY USER (as buyer or seller)
   * REAL: return this.http.get<PaginatedResponse<OrderSummary>>(
   *   `${environment.apiUrl}/orders`, { params: { userId } }
   * );
   */
  getOrdersByUser(userId: string): OrderSummary[] {
    return this._orders()
      .filter(o => o.buyer.id === userId || o.seller.id === userId)
      .map(o => this._toSummary(o, userId));
  }

  /** Get purchases (orders where user is buyer) */
  getPurchases(userId: string): OrderSummary[] {
    return this._orders()
      .filter(o => o.buyer.id === userId)
      .map(o => this._toSummary(o, userId));
  }

  /** Get sales (orders where user is seller) */
  getSales(userId: string): OrderSummary[] {
    return this._orders()
      .filter(o => o.seller.id === userId)
      .map(o => this._toSummary(o, userId));
  }

  /**
   * GET ORDER BY ID
   * REAL: return this.http.get<ApiResponse<Order>>(
   *   `${environment.apiUrl}/orders/${id}`
   * ).pipe(map(r => r.data));
   */
  getOrderById(id: string): Order | undefined {
    return this._orders().find(o => o.id === id);
  }

  // ── Write methods ────────────────────────────────────────────────────────

  /**
   * CREATE ORDER (buyer clicks "Buy Now")
   * REAL: return this.http.post<ApiResponse<Order>>(
   *   `${environment.apiUrl}/orders`, payload
   * );
   */
  createOrder(payload: CreateOrderRequest, buyer: any, seller: any, product: any): Order {
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      product,
      buyer,
      seller,
      price: product.price,
      status: 'pending',
      paymentMethod: payload.paymentMethod,
      shippingAddress: payload.shippingAddress,
      notes: payload.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this._orders.update(list => [...list, newOrder]);
    return newOrder;
  }

  /**
   * UPDATE ORDER STATUS
   * REAL: return this.http.patch<ApiResponse<Order>>(
   *   `${environment.apiUrl}/orders/${id}`, payload
   * );
   */
  updateOrder(id: string, payload: UpdateOrderRequest): Order | undefined {
    let updated: Order | undefined;
    this._orders.update(list =>
      list.map(o => {
        if (o.id === id) {
          updated = { ...o, ...payload, updatedAt: new Date() };
          return updated;
        }
        return o;
      })
    );
    return updated;
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private _toSummary(o: Order, currentUserId: string): OrderSummary {
    const isBuyer = o.buyer.id === currentUserId;
    return {
      id: o.id,
      productId: o.product.id,
      productTitle: o.product.title,
      productThumbnail: o.product.thumbnail,
      price: o.price,
      status: o.status,
      counterpartyName: isBuyer
        ? `${o.seller.firstName} ${o.seller.lastName}`
        : `${o.buyer.firstName} ${o.buyer.lastName}`,
      createdAt: o.createdAt,
    };
  }
}
