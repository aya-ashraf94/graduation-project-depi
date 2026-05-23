import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Product,
  ProductSummary,
  ProductFilters,
  CreateProductRequest,
  UpdateProductRequest,
  CONDITION_LABELS,
  CATEGORY_LABELS,
} from '../models/product.model';



@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/products`;


  // ── Exposed constants ─────────────────────────────────────────────────────
  readonly conditionLabels = CONDITION_LABELS;
  readonly categoryLabels = CATEGORY_LABELS;

  // ── Read methods (API calls) ──────────────────────────────────────────────

  /** Get all products with filtering */
  getProducts(filters?: ProductFilters): Observable<ProductSummary[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof ProductFilters] !== undefined) {
          params = params.set(key, filters[key as keyof ProductFilters]!.toString());
        }
      });
    }
    return this.http.get<ProductSummary[]>(this.apiUrl, { params });
  }

  /** Get product details by ID */
  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  /** Get all listings by a specific seller */
  getProductsBySeller(userId: string): Observable<ProductSummary[]> {
    return this.http.get<ProductSummary[]>(`${this.apiUrl}/user/${userId}`);
  }

  // ── Write methods (API calls) ─────────────────────────────────────────────

  /** Create new product */
  createProduct(payload: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, payload);
  }

  /** Update existing product */
  updateProduct(id: string, payload: UpdateProductRequest): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}`, payload);
  }

  /** Delete product */
  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
