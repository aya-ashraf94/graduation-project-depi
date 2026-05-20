// ============================================================
// REVIEW SERVICE — MOCK + API-READY
//
// HOW TO UPGRADE TO REAL BACKEND:
//   1. Inject HttpClient and environment
//   2. Replace each method body with an HttpClient call
//      Example: getReviewsForUser(userId) →
//        return this.http.get<PaginatedResponse<ReviewSummary>>(
//          `${environment.apiUrl}/users/${userId}/reviews`
//        );
// ============================================================

import { Injectable, signal } from '@angular/core';
import { Review, ReviewSummary, CreateReviewRequest } from '../models/review.model';

// ─── MOCK DATA ─────────────────────────────────────────────────────────────
const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev-001',
    orderId: 'order-001',
    reviewerId: 'user-001',
    revieweeId: 'user-002',
    productId: 'prod-001',
    rating: 5,
    comment: 'Excellent seller! Item exactly as described. Super fast shipping.',
    createdAt: new Date('2025-04-20'),
  },
  {
    id: 'rev-002',
    orderId: 'order-001',
    reviewerId: 'user-002',
    revieweeId: 'user-001',
    productId: 'prod-001',
    rating: 4,
    comment: 'Great buyer, quick payment. Would trade again.',
    createdAt: new Date('2025-04-21'),
  },
  {
    id: 'rev-003',
    orderId: 'order-002',
    reviewerId: 'user-003',
    revieweeId: 'user-001',
    productId: 'prod-003',
    rating: 5,
    comment: 'Smooth transaction, item in perfect condition. Highly recommended!',
    createdAt: new Date('2025-05-01'),
  },
];
// ──────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly _reviews = signal<Review[]>(MOCK_REVIEWS);

  // ── Read methods ────────────────────────────────────────────────────────

  /**
   * GET REVIEWS FOR USER (reviews they received)
   * REAL: return this.http.get<PaginatedResponse<ReviewSummary>>(
   *   `${environment.apiUrl}/users/${userId}/reviews`
   * );
   */
  getReviewsForUser(userId: string): Review[] {
    return this._reviews().filter(r => r.revieweeId === userId);
  }

  /**
   * GET REVIEWS BY USER (reviews they wrote)
   * REAL: return this.http.get<PaginatedResponse<Review>>(
   *   `${environment.apiUrl}/users/${userId}/reviews/written`
   * );
   */
  getReviewsByUser(userId: string): Review[] {
    return this._reviews().filter(r => r.reviewerId === userId);
  }

  /** Get reviews for a specific product */
  getReviewsForProduct(productId: string): Review[] {
    return this._reviews().filter(r => r.productId === productId);
  }

  /** Check if user already reviewed a specific order */
  hasReviewedOrder(orderId: string, reviewerId: string): boolean {
    return this._reviews().some(r => r.orderId === orderId && r.reviewerId === reviewerId);
  }

  /** Calculate average rating for a user */
  getAverageRating(userId: string): number {
    const reviews = this.getReviewsForUser(userId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  // ── Write methods ────────────────────────────────────────────────────────

  /**
   * CREATE REVIEW
   * REAL: return this.http.post<ApiResponse<Review>>(
   *   `${environment.apiUrl}/reviews`, payload
   * );
   */
  createReview(payload: CreateReviewRequest, reviewerId: string): Review {
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      orderId: payload.orderId,
      reviewerId,
      revieweeId: payload.revieweeId,
      productId: payload.productId,
      rating: payload.rating,
      comment: payload.comment,
      createdAt: new Date(),
    };
    this._reviews.update(list => [...list, newReview]);
    return newReview;
  }
}
