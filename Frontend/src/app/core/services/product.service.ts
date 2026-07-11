import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
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

function formatLocationId(id: string): string {
  if (!id) return '';
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/products`;
  private categories$?: Observable<any[]>;

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
    // Set a high limit by default for pages that expect full listing (since client-side pagination is still present)
    if (!params.has('limit')) {
      params = params.set('limit', '500');
    }
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        const arr = res && Array.isArray(res.products) ? res.products : (Array.isArray(res) ? res : []);
        return arr.map((p: any) => this.mapProductSummary(p));
      })
    );
  }

  /** Get recommended products based on user location */
  getRecommendedProducts(governorate: string, city?: string, district?: string, limit: number = 8): Observable<ProductSummary[]> {
    let params = new HttpParams().set('governorate', governorate).set('limit', limit.toString());
    if (city) params = params.set('city', city);
    if (district) params = params.set('district', district);
    return this.http.get<any>(`${this.apiUrl}/recommended`, { params }).pipe(
      map(res => {
        const arr = res && Array.isArray(res.products) ? res.products : [];
        return arr.map((p: any) => this.mapProductSummary(p));
      })
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
  createProduct(payload: any): Observable<Product> {
    let dynamicAttributes: any = (payload as any).dynamicAttributes || {};

    if (!(payload as any).dynamicAttributes) {
      dynamicAttributes = {
        condition: payload.condition === 'new_with_tags' ? 'New' : 'Used',
        conditionScore: payload.conditionScore,
        brand: payload.brand,
        size: payload.size
      };
    }

    const backendPayload = {
      title: payload.title,
      description: payload.description,
      price: payload.price,
      minPrice: payload.minPrice !== undefined && payload.minPrice !== null && (payload.minPrice as any) !== '' ? Number(payload.minPrice) : null,
      dynamicAttributes,
      images: payload.images,
      categoryId: (payload as any).categoryId,
      status: (payload as any).status === 'available' ? 'active' : ((payload as any).status || 'active')
    };

    return this.http.post<any>(this.apiUrl, backendPayload).pipe(
      map(res => this.mapProduct(res.product || res))
    );
  }

  /** Update existing product */
  updateProduct(id: string, payload: UpdateProductRequest): Observable<Product> {
    const backendPayload: any = {
      title: payload.title,
      description: payload.description,
      price: payload.price,
      minPrice: payload.minPrice !== undefined && payload.minPrice !== null && (payload.minPrice as any) !== '' ? Number(payload.minPrice) : null,

      images: payload.images,
      categoryId: (payload as any).categoryId,

      status:
        payload.status === 'available'
          ? 'active'
          : payload.status
    };

    if (payload.dynamicAttributes) {
      backendPayload.dynamicAttributes = payload.dynamicAttributes;
    } else {
      const dynamicAttributes: any = {};
      if (payload.condition) {
        dynamicAttributes.condition = payload.condition === 'new_with_tags' ? 'New' : 'Used';
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
      if (payload.size) {
        backendPayload.size = payload.size;
      }
      if (payload.brand) {
        backendPayload.brand = payload.brand;
      }
      if (Object.keys(dynamicAttributes).length > 0) {
        backendPayload.dynamicAttributes = dynamicAttributes;
      }
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, backendPayload).pipe(
      map(res => this.mapProduct(res.product || res))
    );
  }

  /** Reserve product for checkout (10-min soft lock) */
  reserveProduct(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reserve`, {});
  }

  /** Release product reservation */
  releaseProduct(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/release`, {});
  }

  /** Delete product */
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /** Get all categories from backend */
  getCategories(): Observable<any[]> {
    if (!this.categories$) {
      this.categories$ = this.http.get<any[]>(`${environment.apiUrl}/categories`).pipe(
        shareReplay(1)
      );
    }
    return this.categories$;
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
    const condStr = (dynamic.condition || dynamic.Condition || '').toLowerCase().replace(/\s+/g, '_');
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
    const brand = dynamic.brand || p.brand || '';

    // size
    const size = dynamic.size || p.size || undefined;

    // category
    let category: ProductCategory = 'other';
    const catName = p.categoryId?.name || '';
    if (catName) {
      const lowerCat = catName.toLowerCase().trim();
      const CATEGORY_NAME_MAP: Record<string, ProductCategory> = {
        'outerwear': 'outerwear',
        'tops': 'tops',
        'bottoms': 'bottoms',
        'footwear': 'footwear',
        'accessories': 'accessories',
        'electronics': 'electronics',
        'mobiles': 'electronics',
        'laptops': 'electronics',
        'electronics & gadgets': 'electronics',
        'furniture': 'furniture',
        'home appliances': 'furniture',
        'furniture & home': 'furniture',
        'books': 'books',
        'books & media': 'books',
        'sports & fitness': 'sports',
        'sports': 'sports',
        'clothes': 'tops',
        'clothing & apparel': 'tops',
      };
      category = CATEGORY_NAME_MAP[lowerCat] || 'other';
    }

    // Derive a display-friendly categoryName when backend name is unhelpful
    const rawCategoryName = p.categoryId?.name || '';
    const DERIVED_DISPLAY_NAMES: Record<ProductCategory, string> = {
      'outerwear': 'Outerwear',
      'tops': 'Tops',
      'bottoms': 'Bottoms',
      'footwear': 'Footwear',
      'accessories': 'Accessories',
      'electronics': 'Electronics',
      'furniture': 'Furniture',
      'books': 'Books',
      'sports': 'Sports & Fitness',
      'other': 'Other',
    };
    const displayCategoryName = (rawCategoryName && rawCategoryName !== 'Other')
      ? rawCategoryName
      : DERIVED_DISPLAY_NAMES[category] || 'Other';

    // seller
    let seller: UserSummary = {
      id: '',
      firstName: 'SELLER',
      lastName: '',
      avatar: 'https://i.pravatar.cc/150',
      rating: 5.0,
      isVerified: false
    };
    let sellerUser: any = null;

    if (p.userId && typeof p.userId === 'object') {
      sellerUser = p.userId;
      const nameParts = (sellerUser.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'SELLER';
      const lastName = nameParts.slice(1).join(' ') || '';
      seller = {
        id: sellerUser._id || sellerUser.id,
        firstName,
        lastName,
        avatar: sellerUser.avatar || `https://i.pravatar.cc/150?u=${sellerUser.email || sellerUser.id || sellerUser._id}`,
        rating: sellerUser.rating ?? 5.0,
        isVerified: sellerUser.isVerified ?? false,
        successRate: sellerUser.successRate ?? 100,
        totalSales: sellerUser.totalSales ?? 0
      };
    } else if (p.userId && typeof p.userId === 'string') {
      seller.id = p.userId;
    }

    const locString = sellerUser?.governorate
      ? (sellerUser?.district
        ? `${formatLocationId(sellerUser.district)}, ${formatLocationId(sellerUser.city || sellerUser.governorate)}`
        : sellerUser.city
          ? `${formatLocationId(sellerUser.city)}, ${formatLocationId(sellerUser.governorate)}`
          : formatLocationId(sellerUser.governorate))
      : (p.location || '');
    const phoneStr = sellerUser?.phoneNumber || p.phoneNumber || '';

    return {
      id: p.id || p._id,
      title: p.title || '',
      brand,
      description: p.description || '',
      price: p.price || 0,
      minPrice: p.minPrice ?? null,
      condition,
      conditionScore,
      category,
      size,
      sku: (p.id || p._id || '').substring(0, 8).toUpperCase(),
      images: p.images && p.images.length > 0
        ? p.images.map((img: string) => img.startsWith('/uploads') ? `${baseUrl}${img}` : img)
        : [],
      badge: dynamic.badge || '',
      status: (p.status === 'active' || p.status === 'available') ? 'available' : (p.status || 'available'),
      seller,
      viewCount: p.viewCount || 0,
      favoriteCount: p.favoriteCount || 0,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      categoryName: displayCategoryName,
      soldByNafa3ni: p.soldByNafa3ni || false,
      isVerified: p.isVerified || false,

      // Location and phone come from seller profile (the user object)
      location: locString,
      phoneNumber: phoneStr,
      showContactInfo: p.showContactInfo ?? true,
      // Structured location data from seller
      sellerGovernorate: sellerUser?.governorate || '',
      sellerCity: sellerUser?.city || '',
      sellerDistrict: sellerUser?.district || '',
      categoryId: p.categoryId,
      rawDynamicAttributes: dynamic,

      originalPrice: p.originalPrice ?? undefined,
      salePrice: p.salePrice ?? undefined,
      flashSaleName: p.flashSaleName ?? undefined,
      isFlashSale: p.isFlashSale ?? false,
      isOnSale: p.isOnSale ?? false,
      categorySalePercent: p.categorySalePercent ?? undefined,
      savingsPercent: p.savingsPercent ?? undefined,
      savingsValue: p.savingsValue ?? undefined,
      saleEnd: p.saleEnd ?? undefined

    } as any;
  }

  public mapProductSummary(p: any): ProductSummary {
    const mapped = this.mapProduct(p);
    return {
      id: mapped.id,
      title: mapped.title,
      brand: mapped.brand,
      description: mapped.description,
      price: mapped.price,
      minPrice: mapped.minPrice,
      condition: mapped.condition,
      conditionScore: mapped.conditionScore,
      category: mapped.category,
      thumbnail: mapped.images[0] || '',
      badge: mapped.badge,
      status: mapped.status,
      sellerId: mapped.seller.id,
      sellerName: mapped.seller.firstName && mapped.seller.lastName
        ? `${mapped.seller.firstName} ${mapped.seller.lastName}`
        : mapped.seller.firstName,
      sellerAvatar: mapped.seller.avatar,
      createdAt: mapped.createdAt,
      categoryName: mapped.categoryName,
      soldByNafa3ni: mapped.soldByNafa3ni,
      isVerified: mapped.isVerified,
      size: mapped.size,
      location: mapped.location || '',
      sellerGovernorate: mapped.sellerGovernorate || '',
      sellerCity: mapped.sellerCity || '',
      sellerDistrict: mapped.sellerDistrict || '',

      originalPrice: mapped.originalPrice,
      salePrice: mapped.salePrice,
      flashSaleName: mapped.flashSaleName,
      isFlashSale: mapped.isFlashSale,
      isOnSale: mapped.isOnSale,
      categorySalePercent: mapped.categorySalePercent,
      savingsPercent: mapped.savingsPercent,
      savingsValue: mapped.savingsValue,
      saleEnd: mapped.saleEnd
    } as any;
  }

  /** Report a listing */
  reportProduct(productId: string, reason: string, details?: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/reports`, { productId, reason, details });
  }

  /** Subscribe to newsletter */
  subscribeNewsletter(email: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/support/newsletter`, { email });
  }
}

