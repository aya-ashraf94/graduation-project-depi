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
  ProductCondition,
  ProductCategory,
} from '../models/product.model';
import { UserSummary } from '../models/user.model';

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
    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map(products => products.map(p => this.mapProductSummary(p)))
    );
  }

  /** Get product details by ID */
  getProductById(id: string): Observable<Product> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(p => this.mapProduct(p))
    );
  }

  /** Get all listings by a specific seller */
  getProductsBySeller(userId: string): Observable<ProductSummary[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`).pipe(
      map(products => products.map(p => this.mapProductSummary(p)))
    );
  }

  // ── Write methods (API calls) ─────────────────────────────────────────────

  /** Create new product */
  createProduct(payload: CreateProductRequest): Observable<Product> {
    const dynamicAttributes = {
      Condition: payload.condition === 'new_with_tags' ? 'New' : 'Used',
      conditionScore: payload.conditionScore,
      brand: payload.brand,
      size: payload.size
    };

    const backendPayload = {
      title: payload.title,
      description: payload.description,
      price: payload.price,
      dynamicAttributes,
      images: payload.images,
      categoryId: (payload as any).categoryId,
      location: (payload as any).location || 'Cairo',
      phoneNumber: (payload as any).phoneNumber || '0123456789'
    };

    return this.http.post<any>(this.apiUrl, backendPayload).pipe(
      map(res => this.mapProduct(res.product || res))
    );
  }

  /** Update existing product */
  updateProduct(id: string, payload: UpdateProductRequest): Observable<Product> {
    const dynamicAttributes: any = {};
    if (payload.condition) {
      dynamicAttributes.Condition = payload.condition === 'new_with_tags' ? 'New' : 'Used';
    }
    if (payload.size) {
      dynamicAttributes.size = payload.size;
    }
    if (payload.brand) {
      dynamicAttributes.brand = payload.brand;
    }
    if (payload.conditionScore !== undefined) {
      dynamicAttributes.conditionScore = payload.conditionScore;
    }

    const backendPayload: any = {
      title: payload.title,
      description: payload.description,
      price: payload.price,
      images: payload.images,
    };

    if (Object.keys(dynamicAttributes).length > 0) {
      backendPayload.dynamicAttributes = dynamicAttributes;
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, backendPayload).pipe(
      map(res => this.mapProduct(res.product || res))
    );
  }

  /** Delete product */
  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Get all categories from backend */
  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/categories`);
  }

  /** Get product counts grouped by category */
  getCategoryCounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/counts/by-category`);
  }

  // ── Mapping functions ─────────────────────────────────────────────────────

  public mapProduct(p: any): Product {
    if (!p) return p;
    const dynamic = p.dynamicAttributes || {};
    const baseUrl = environment.apiUrl.replace('/api', '');
    
    // Parse condition
    let condition: ProductCondition = 'good';
    const condStr = (dynamic.Condition || dynamic.condition || '').toLowerCase().replace(/\s+/g, '_');
    if (['new_with_tags', 'excellent', 'good', 'fair', 'distressed'].includes(condStr)) {
      condition = condStr as ProductCondition;
    } else if (condStr === 'new') {
      condition = 'new_with_tags';
    } else if (condStr === 'used') {
      condition = 'good';
    }

    // conditionScore
    let conditionScore = parseFloat(dynamic.conditionScore || dynamic.score || '8.0');
    if (isNaN(conditionScore)) {
      conditionScore = 8.0;
    }

    // brand
    const brand = dynamic.brand || p.brand || 'ARCHIVE';

    // size
    const size = dynamic.size || p.size || undefined;

    // category
    let category: ProductCategory = 'other';
    const catName = p.categoryId?.name || '';
    if (catName) {
      const lowerCat = catName.toLowerCase();
      if (lowerCat.includes('clothes') || lowerCat.includes('apparel')) {
        category = 'tops';
      } else if (lowerCat.includes('laptop') || lowerCat.includes('mobile') || lowerCat.includes('electronics')) {
        category = 'electronics';
      } else if (lowerCat.includes('appliance') || lowerCat.includes('furniture')) {
        category = 'furniture';
      } else if (lowerCat.includes('sport')) {
        category = 'sports';
      } else if (lowerCat.includes('book')) {
        category = 'books';
      }
    }

    // seller
    let seller: UserSummary = {
      id: '',
      firstName: 'SELLER',
      lastName: '',
      avatar: 'https://i.pravatar.cc/150',
      rating: 5.0,
      isVerified: false
    };

    if (p.userId && typeof p.userId === 'object') {
      const u = p.userId;
      const nameParts = (u.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'SELLER';
      const lastName = nameParts.slice(1).join(' ') || '';
      seller = {
        id: u._id || u.id,
        firstName,
        lastName,
        avatar: u.avatar && u.avatar.startsWith('/uploads')
          ? `${baseUrl}${u.avatar}`
          : u.avatar || `https://i.pravatar.cc/150?u=${u.email || u._id}`,
        rating: u.rating ?? 5.0,
        isVerified: u.isVerified ?? false
      };
    } else if (p.userId && typeof p.userId === 'string') {
      seller.id = p.userId;
    }

    return {
      id: p._id || p.id,
      title: p.title || '',
      brand,
      description: p.description || '',
      price: p.price || 0,
      condition,
      conditionScore,
      category,
      size,
      sku: p._id ? p._id.substring(0, 8).toUpperCase() : '',
      images: p.images && p.images.length > 0 
        ? p.images.map((img: string) => img.startsWith('/uploads') ? `${baseUrl}${img}` : img)
        : ['https://images.unsplash.com/photo-1551028150-64b9f398f678'],
      badge: dynamic.badge || '',
      status: (p.status === 'active' || p.status === 'available') ? 'available' : (p.status || 'available'),
      seller,
      viewCount: p.viewCount || 0,
      favoriteCount: p.favoriteCount || 0,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      categoryName: p.categoryId?.name || '',
      soldByNafa3ni: p.soldByNafa3ni || false,
      isVerified: p.isVerified || false
    } as any;
  }

  public mapProductSummary(p: any): ProductSummary {
    const mapped = this.mapProduct(p);
    return {
      id: mapped.id,
      title: mapped.title,
      brand: mapped.brand,
      price: mapped.price,
      condition: mapped.condition,
      conditionScore: mapped.conditionScore,
      category: mapped.category,
      thumbnail: mapped.images[0] || '',
      badge: mapped.badge,
      status: mapped.status,
      sellerId: mapped.seller.id,
      createdAt: mapped.createdAt,
      categoryName: p.categoryId?.name || '',
      soldByNafa3ni: mapped.soldByNafa3ni,
      isVerified: mapped.isVerified
    } as any;
  }

  /** Report a listing */
  reportProduct(productId: string, reason: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/reports`, { productId, reason });
  }

  /** Subscribe to newsletter */
  subscribeNewsletter(email: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/support/newsletter`, { email });
  }
}

