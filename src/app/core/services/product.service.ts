// ============================================================
// PRODUCT SERVICE — MOCK + API-READY
//
// HOW TO UPGRADE TO REAL BACKEND:
//   1. Inject HttpClient and environment
//   2. Replace each method body with an HttpClient call
//      Example: getProducts(filters) →
//        return this.http.get<PaginatedResponse<ProductSummary>>(
//          `${environment.apiUrl}/products`, { params: { ...filters } }
//        );
// ============================================================

import { Injectable, signal, computed } from '@angular/core';
import {
  Product,
  ProductSummary,
  ProductFilters,
  ProductCategory,
  ProductCondition,
  CreateProductRequest,
  UpdateProductRequest,
  CONDITION_LABELS,
  CATEGORY_LABELS,
} from '../models/product.model';

// ─── MOCK DATA (replace with HTTP calls when backend is ready) ─────────────
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    title: 'Muted Moto Jacket 2018',
    brand: 'ACNE STUDIOS',
    description: 'Architectural utility meets industrial aesthetics. Supple leather with signature offset zip.',
    price: 850,
    condition: 'excellent',
    conditionScore: 9.0,
    category: 'outerwear',
    size: 'M',
    sku: 'AS-MJ-2018',
    images: ['https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=800&auto=format&fit=crop'],
    badge: '',
    status: 'available',
    seller: { id: 'user-002', firstName: 'Mia', lastName: 'K.', rating: 4.9, isVerified: true },
    viewCount: 142,
    favoriteCount: 38,
    createdAt: new Date('2025-04-10'),
    updatedAt: new Date('2025-04-10'),
  },
  {
    id: 'prod-002',
    title: 'Riot Riot Riot Bomber Camo',
    brand: 'RAF SIMONS',
    description: 'High-contrast equipment for the modern digital workspace. Archive piece from SS11.',
    price: 12500,
    condition: 'good',
    conditionScore: 8.0,
    category: 'outerwear',
    size: 'L',
    sku: 'RS-RRR-CAMO',
    images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop'],
    badge: 'RARE ARCHIVE',
    status: 'available',
    seller: { id: 'user-003', firstName: 'Jay', lastName: 'T.', rating: 4.7, isVerified: true },
    viewCount: 890,
    favoriteCount: 211,
    createdAt: new Date('2025-03-22'),
    updatedAt: new Date('2025-03-22'),
  },
  {
    id: 'prod-003',
    title: '1955 501 XX Customized',
    brand: "LEVI'S VINTAGE",
    description: 'Engineered for durability. Hand-distressed, selvedge denim, perfect fade.',
    price: 450,
    condition: 'distressed',
    conditionScore: 7.5,
    category: 'bottoms',
    size: 'W32 L34',
    sku: 'LV-501-1955',
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop'],
    badge: '',
    status: 'available',
    seller: { id: 'user-004', firstName: 'Sam', lastName: 'B.', rating: 4.5, isVerified: false },
    viewCount: 56,
    favoriteCount: 12,
    createdAt: new Date('2025-05-01'),
    updatedAt: new Date('2025-05-01'),
  },
  {
    id: 'prod-004',
    title: 'Geobasket Black/Milk',
    brand: 'RICK OWENS',
    description: 'The essential tool for heavy-duty style. Chunky platform, signature draping laces.',
    price: 650,
    condition: 'excellent',
    conditionScore: 9.5,
    category: 'footwear',
    size: 'EU 43',
    sku: 'RO-GB-BLK',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop'],
    badge: '',
    status: 'available',
    seller: { id: 'user-002', firstName: 'Mia', lastName: 'K.', rating: 4.9, isVerified: true },
    viewCount: 320,
    favoriteCount: 87,
    createdAt: new Date('2025-04-28'),
    updatedAt: new Date('2025-04-28'),
  },
  {
    id: 'prod-005',
    title: "Heavy ID Bracelet '11",
    brand: 'MAISON MARGIELA',
    description: 'Sterling silver, heavy gauge. Naturally tarnished from wear — character guaranteed.',
    price: 320,
    condition: 'fair',
    conditionScore: 6.5,
    category: 'accessories',
    size: 'OS',
    sku: 'MM-AC-2011',
    images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop'],
    badge: '',
    status: 'available',
    seller: { id: 'user-005', firstName: 'Leo', lastName: 'V.', rating: 4.6, isVerified: true },
    viewCount: 78,
    favoriteCount: 19,
    createdAt: new Date('2025-05-08'),
    updatedAt: new Date('2025-05-08'),
  },
  {
    id: 'prod-006',
    title: 'Boiled Wool Sweater',
    brand: 'COMME DES GARCONS',
    description: 'Deadstock NWT. Architectural seaming, irregular hem. Zero wear.',
    price: 580,
    condition: 'new_with_tags',
    conditionScore: 10,
    category: 'tops',
    size: 'S',
    sku: 'CDG-TP-004',
    images: ['https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop'],
    badge: 'NEW W/ TAGS',
    status: 'available',
    seller: { id: 'user-003', firstName: 'Jay', lastName: 'T.', rating: 4.7, isVerified: true },
    viewCount: 204,
    favoriteCount: 64,
    createdAt: new Date('2025-05-10'),
    updatedAt: new Date('2025-05-10'),
  },
];
// ──────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ProductService {
  // Internal mock store — remove when using HttpClient
  private _products = signal<Product[]>(MOCK_PRODUCTS);

  // ── Exposed constants (useful in templates/forms) ─────────────────────────
  readonly conditionLabels = CONDITION_LABELS;
  readonly categoryLabels = CATEGORY_LABELS;

  readonly categories: ProductCategory[] = [
    'outerwear', 'tops', 'bottoms', 'footwear',
    'accessories', 'electronics', 'furniture', 'books', 'sports', 'other',
  ];

  readonly conditions: ProductCondition[] = [
    'new_with_tags', 'excellent', 'good', 'fair', 'distressed',
  ];

  // ── Read methods ─────────────────────────────────────────────────────────

  /**
   * GET ALL PRODUCTS (with optional filters)
   * REAL: return this.http.get<PaginatedResponse<ProductSummary>>(
   *   `${environment.apiUrl}/products`, { params: { ...filters } }
   * );
   */
  getProducts(filters?: ProductFilters): ProductSummary[] {
    let results = this._products();

    if (filters?.category) {
      results = results.filter(p => p.category === filters.category);
    }
    if (filters?.condition) {
      results = results.filter(p => p.condition === filters.condition);
    }
    if (filters?.minPrice !== undefined) {
      results = results.filter(p => p.price >= filters.minPrice!);
    }
    if (filters?.maxPrice !== undefined) {
      results = results.filter(p => p.price <= filters.maxPrice!);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        p => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      );
    }

    // Sort
    if (filters?.sortBy === 'price_asc') results = [...results].sort((a, b) => a.price - b.price);
    if (filters?.sortBy === 'price_desc') results = [...results].sort((a, b) => b.price - a.price);
    if (filters?.sortBy === 'newest') results = [...results].sort((a, b) => +b.createdAt - +a.createdAt);
    if (filters?.sortBy === 'popular') results = [...results].sort((a, b) => b.favoriteCount - a.favoriteCount);

    return results.map(p => this._toSummary(p));
  }

  /**
   * GET PRODUCT BY ID
   * REAL: return this.http.get<ApiResponse<Product>>(
   *   `${environment.apiUrl}/products/${id}`
   * ).pipe(map(r => r.data));
   */
  getProductById(id: string): Product | undefined {
    return this._products().find(p => p.id === id);
  }

  /** Get all listings by a specific seller */
  getProductsBySeller(sellerId: string): ProductSummary[] {
    return this._products()
      .filter(p => p.seller.id === sellerId)
      .map(p => this._toSummary(p));
  }

  // ── Write methods ────────────────────────────────────────────────────────

  /**
   * CREATE LISTING
   * REAL: return this.http.post<ApiResponse<Product>>(
   *   `${environment.apiUrl}/products`, payload
   * );
   */
  createProduct(payload: CreateProductRequest, sellerId: string): Product {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      ...payload,
      badge: '',
      status: 'available',
      seller: { id: sellerId, firstName: '', lastName: '', rating: 0, isVerified: false },
      viewCount: 0,
      favoriteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this._products.update(list => [...list, newProduct]);
    return newProduct;
  }

  /**
   * UPDATE LISTING
   * REAL: return this.http.patch<ApiResponse<Product>>(
   *   `${environment.apiUrl}/products/${id}`, payload
   * );
   */
  updateProduct(id: string, payload: UpdateProductRequest): Product | undefined {
    let updated: Product | undefined;
    this._products.update(list =>
      list.map(p => {
        if (p.id === id) {
          updated = { ...p, ...payload, updatedAt: new Date() };
          return updated;
        }
        return p;
      })
    );
    return updated;
  }

  /**
   * DELETE LISTING
   * REAL: return this.http.delete(`${environment.apiUrl}/products/${id}`);
   */
  deleteProduct(id: string): void {
    this._products.update(list => list.filter(p => p.id !== id));
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private _toSummary(p: Product): ProductSummary {
    return {
      id: p.id,
      title: p.title,
      brand: p.brand,
      price: p.price,
      condition: p.condition,
      conditionScore: p.conditionScore,
      category: p.category,
      thumbnail: p.images[0] ?? '',
      badge: p.badge,
      status: p.status,
      sellerId: p.seller.id,
      createdAt: p.createdAt,
    };
  }
}
