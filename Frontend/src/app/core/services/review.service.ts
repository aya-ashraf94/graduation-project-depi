import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Review, CreateReviewRequest } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reviews`;

  /** GET REVIEWS FOR USER (reviews they received) */
  getReviewsForUser(userId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/user/${userId}`);
  }

  /** GET REVIEWS BY USER (reviews they wrote) */
  getReviewsByUser(userId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/written/${userId}`);
  }

  /** CREATE REVIEW */
  createReview(payload: CreateReviewRequest): Observable<Review> {
    return this.http.post<Review>(this.apiUrl, payload);
  }
}
