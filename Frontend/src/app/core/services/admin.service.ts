import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { Product } from '../models/product.model';
import { ProductService } from './product.service';

export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  openReports: number;
  totalOrders: number;
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
}

export interface AdminReport {
  _id: string;
  productId: {
    _id: string;
    title: string;
    userId?: {
      _id: string;
      name: string;
      email: string;
    }
  } | null;
  reporterId: {
    _id: string;
    name: string;
    email: string;
  } | null;
  reason: string;
  details?: string;
  createdAt: string | Date;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private productService = inject(ProductService);
  private apiUrl = `${environment.apiUrl}/admin`;

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }

  getUsers(page: number, limit: number, search?: string): Observable<PaginatedUsers> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (search) {
      params = params.set('search', search);
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
    filters?: { status?: string; category?: string }
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

  getReports(): Observable<AdminReport[]> {
    return this.http.get<AdminReport[]>(`${this.apiUrl}/reports`);
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
        pages: res.pages
      }))
    );
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
        : u.avatar || `https://i.pravatar.cc/150?u=${u.email || u._id}`,
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
