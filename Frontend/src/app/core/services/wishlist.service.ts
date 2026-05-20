// ============================================================
// WISHLIST SERVICE — MOCK + API-READY
//
// HOW TO UPGRADE TO REAL BACKEND:
//   1. Inject HttpClient and environment
//   2. Replace each method body with an HttpClient call
//      Example: getWishlist(userId) →
//        return this.http.get<ApiResponse<string[]>>(
//          `${environment.apiUrl}/users/${userId}/wishlist`
//        ).pipe(map(r => r.data));
// ============================================================

import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  /** Set of product IDs in the user's wishlist */
  private readonly _wishlistIds = signal<Set<string>>(new Set(this._load()));

  /** Reactive count for badge display */
  readonly count = computed(() => this._wishlistIds().size);

  /** Check if a product is wishlisted */
  isWishlisted(productId: string): boolean {
    return this._wishlistIds().has(productId);
  }

  /** Get all wishlisted product IDs */
  getWishlistIds(): string[] {
    return Array.from(this._wishlistIds());
  }

  /**
   * TOGGLE WISHLIST
   * REAL: return this.http.post(`${environment.apiUrl}/wishlist/toggle`, { productId });
   */
  toggle(productId: string): boolean {
    const current = new Set(this._wishlistIds());
    let added: boolean;

    if (current.has(productId)) {
      current.delete(productId);
      added = false;
    } else {
      current.add(productId);
      added = true;
    }

    this._wishlistIds.set(current);
    this._save(current);
    return added;
  }

  /**
   * ADD TO WISHLIST
   * REAL: return this.http.post(`${environment.apiUrl}/wishlist`, { productId });
   */
  add(productId: string): void {
    const current = new Set(this._wishlistIds());
    current.add(productId);
    this._wishlistIds.set(current);
    this._save(current);
  }

  /**
   * REMOVE FROM WISHLIST
   * REAL: return this.http.delete(`${environment.apiUrl}/wishlist/${productId}`);
   */
  remove(productId: string): void {
    const current = new Set(this._wishlistIds());
    current.delete(productId);
    this._wishlistIds.set(current);
    this._save(current);
  }

  // ── Persistence (localStorage until backend is ready) ──────────────────
  private _save(ids: Set<string>): void {
    localStorage.setItem('arch_wishlist', JSON.stringify(Array.from(ids)));
  }

  private _load(): string[] {
    const raw = localStorage.getItem('arch_wishlist');
    return raw ? JSON.parse(raw) : [];
  }
}
