// ============================================================
// WISHLIST SERVICE — REAL BACKEND INTEGRATION
// ============================================================

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth';
import { ProductService } from './product.service';
import { environment } from '../../../environments/environment';
import { ProductSummary } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private productService = inject(ProductService);

  /** Set of product IDs in the user's wishlist */
  private readonly _wishlistIds = signal<Set<string>>(new Set());

  /** Reactive count for badge display */
  readonly count = computed(() => this._wishlistIds().size);

  constructor() {
    // Automatically synchronize wishlist IDs when logged-in state changes
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.fetchWishlistIds();
      } else {
        this._wishlistIds.set(new Set());
      }
    });
  }

  /** Fetch wishlist IDs from backend */
  fetchWishlistIds(): void {
    this.http.get<string[]>(`${environment.apiUrl}/wishlist/ids`).subscribe({
      next: (ids) => {
        this._wishlistIds.set(new Set(ids));
      },
      error: (err) => {
        console.error('Error fetching wishlist IDs:', err);
      }
    });
  }

  /** Check if a product is wishlisted */
  isWishlisted(productId: string): boolean {
    return this._wishlistIds().has(productId);
  }

  /** Get all wishlisted product IDs */
  getWishlistIds(): string[] {
    return Array.from(this._wishlistIds());
  }

  /** Fetch fully populated wishlisted products */
  getWishlistProducts(): Observable<ProductSummary[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/wishlist`).pipe(
      map(products => products.map(p => this.productService.mapProductSummary(p)))
    );
  }

  /**
   * TOGGLE WISHLIST (Optimistic UI Update with rollback on error)
   */
  toggle(productId: string): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }

    const current = new Set(this._wishlistIds());
    let added: boolean;

    if (current.has(productId)) {
      current.delete(productId);
      added = false;
    } else {
      current.add(productId);
      added = true;
    }

    // Optimistically set state
    this._wishlistIds.set(current);

    // Sync with backend API
    this.http.post<any>(`${environment.apiUrl}/wishlist/toggle`, { productId }).subscribe({
      error: (err) => {
        console.error('Error syncing wishlist toggle with backend:', err);
        // Rollback state on error
        const rollback = new Set(this._wishlistIds());
        if (added) {
          rollback.delete(productId);
        } else {
          rollback.add(productId);
        }
        this._wishlistIds.set(rollback);
      }
    });

    return added;
  }

  /**
   * ADD TO WISHLIST
   */
  add(productId: string): void {
    if (!this.isWishlisted(productId)) {
      this.toggle(productId);
    }
  }

  /**
   * REMOVE FROM WISHLIST
   */
  remove(productId: string): void {
    if (this.isWishlisted(productId)) {
      this.toggle(productId);
    }
  }
}
