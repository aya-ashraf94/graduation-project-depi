import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { Product } from '../models/product.model';
import { ProductService } from './product.service';

export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalVerified: number;
  totalSuspended: number;
  totalProducts: number;
  activeProducts: number;
  soldProducts: number;
  totalProductViews: number;
  openReports: number;
  totalOrders: number;
}

export interface DashboardData {
  stats: {
    totalUsers: number;
    totalProducts: number;
    openReports: number;
    todayRevenue: number;
    todayPlatformFee: number;
    todayOrders: number;
    newUsers7d: number;
    pendingVerifications: number;
  };
  revenueHistory: { date: string; revenue: number }[];
  recentOrders: {
    id: string;
    productTitle: string;
    productThumbnail: string;
    price: number;
    status: string;
    buyerName: string;
    createdAt: string;
  }[];
  topCategories: { name: string; productCount: number; percentage: number }[];
  pendingApprovals: { unverifiedProducts: number; unverifiedUsers: number };
  flashSaleStats: { activeSales: number; totalDiscountGiven: number };
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  pages: number;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}

export interface PaginatedOrders {
  orders: any[];
  total: number;
  page: number;
  pages: number;
  totals?: { grossRevenue: number; platformFees: number };
}

export interface AdminReport {
  id: string;
  productId: {
    id: string;
    title: string;
    userId?: {
      id: string;
      name: string;
      email: string;
    }
  } | null;
  reporterId: {
    id: string;
    name: string;
    email: string;
  } | null;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string | Date;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private productService = inject(ProductService);
  private apiUrl = `${environment.apiUrl}/admin`;

  pendingReportCount = signal(0);

  refreshPendingCount(): void {
    this.getStats().subscribe({
      next: (stats) => this.pendingReportCount.set(stats.openReports),
      error: () => {}
    });
  }

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }

  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard`);
  }

  getUsers(page: number, limit: number, filters?: { search?: string; role?: string; status?: string; verified?: string }): Observable<PaginatedUsers> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.role) {
      params = params.set('role', filters.role);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.verified) {
      params = params.set('verified', filters.verified);
    }

    return this.http.get<any>(`${this.apiUrl}/users`, { params }).pipe(
      map(res => ({
        users: (res.users || []).map((u: any) => this.mapUser(u)),
        total: res.total,
        page: res.page,
        pages: res.pages
      }))
    );
  }

  patchUser(id: string, payload: { isVerified?: boolean; role?: string; isSuspended?: boolean }): Observable<User> {
    return this.http.patch<any>(`${this.apiUrl}/users/${id}`, payload).pipe(
      map(u => this.mapUser(u))
    );
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${id}`);
  }

  getAllProducts(
    page: number, 
    limit: number, 
    filters?: { status?: string; category?: string; search?: string; verified?: string }
  ): Observable<PaginatedProducts> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.category) {
      params = params.set('category', filters.category);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.verified) {
      params = params.set('verified', filters.verified);
    }

    return this.http.get<any>(`${this.apiUrl}/products`, { params }).pipe(
      map(res => ({
        products: (res.products || []).map((p: any) => this.productService.mapProduct(p)),
        total: res.total,
        page: res.page,
        pages: res.pages
      }))
    );
  }

  patchProduct(id: string, payload: { isVerified?: boolean; status?: string }): Observable<Product> {
    return this.http.patch<any>(`${this.apiUrl}/products/${id}`, payload).pipe(
      map(p => this.productService.mapProduct(p))
    );
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/products/${id}`);
  }

  updateOrderStatus(id: string, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/orders/${id}/status`, { status });
  }

  getReports(): Observable<AdminReport[]> {
    return this.http.get<AdminReport[]>(`${this.apiUrl}/reports`);
  }

  resolveReport(id: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/reports/${id}/resolve`, {});
  }

  deleteReport(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/reports/${id}`);
  }

  getAllOrders(page: number, limit: number, status?: string): Observable<PaginatedOrders> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<any>(`${this.apiUrl}/orders`, { params }).pipe(
      map(res => ({
        orders: res.orders || [],
        total: res.total,
        page: res.page,
        pages: res.pages,
        totals: res.totals
      }))
    );
  }

  getCoupons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/coupons`);
  }

  createCoupon(payload: { code: string; discountType: string; discountValue: number; expiryDate?: Date | string | null }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/coupons`, payload);
  }

  patchCoupon(id: string, payload: { discountType?: string; discountValue?: number; expiryDate?: Date | string | null; isActive?: boolean }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/coupons/${id}`, payload);
  }

  deleteCoupon(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/coupons/${id}`);
  }

  private mapUser(u: any): User {
    if (!u) return u;
    const nameParts = (u.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'USER';
    const lastName = nameParts.slice(1).join(' ') || '';
    const baseUrl = environment.apiUrl.replace('/api', '');
    return {
      id: u._id || u.id,
      firstName,
      lastName,
      email: u.email || '',
      avatar: u.avatar && u.avatar.startsWith('/uploads')
        ? `${baseUrl}${u.avatar}`
        : u.avatar || '',
      role: u.role || 'user',
      rating: u.rating ?? 5.0,
      totalSales: u.totalSales ?? 0,
      totalPurchases: u.totalPurchases ?? 0,
      joinedAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      isVerified: u.isVerified ?? false,
      isSuspended: u.isSuspended ?? false,
      phoneNumber: u.phoneNumber || '',
      location: u.location || 'Cairo',
      bio: u.bio || '',
      tags: u.tags || []
    };
  }
}
