import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReviewService } from '../../../../core/services/review.service';
import { Review } from '../../../../core/models/review.model';
import { UserAvatarComponent } from '../../../../shared/components/user-avatar/user-avatar';
import { RatingDisplayComponent } from '../../../../shared/components/rating-display/rating-display';
import { formatReviews, getReviewerName, getReviewerId } from '../../../../shared/utils/review.utils';

@Component({
  selector: 'app-all-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink, UserAvatarComponent, RatingDisplayComponent],
  template: `
    <div class="all-reviews-page">
      <div class="all-reviews-container">
        <div class="all-reviews-header">
          <a [routerLink]="['/profile', userId]" class="back-link">← Back to Profile</a>
          <h1>All Reviews</h1>
        </div>

        @if (loading()) {
          <div class="loading-state">Loading reviews...</div>
        } @else if (reviews().length === 0) {
          <div class="empty-state">No reviews received yet.</div>
        } @else {
          <div class="reviews-list">
            @for (review of reviews(); track review.id) {
              <div class="review-card">
                <div class="review-card-header">
                  <div class="reviewer-info">
                    <div class="reviewer-avatar">
                      <app-user-avatar [user]="review.reviewerId" />
                    </div>
                    <div>
                      <a class="reviewer-name" [routerLink]="['/profile', getReviewerId(review)]">{{ getReviewerName(review) }}</a>
                      <app-rating-display [rating]="review.rating" size="sm" />
                    </div>
                  </div>
                  <div class="review-date">{{ review.createdAt | date:'mediumDate' }}</div>
                </div>
                <div class="review-body">
                  <p>"{{ review.comment }}"</p>
                  @if (review.response) {
                    <div class="seller-response">
                      <strong>Seller Response:</strong> {{ review.response }}
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .all-reviews-page {
      min-height: calc(100vh - var(--navbar-height));
      background: var(--gray);
      padding: 2rem 1.5rem;
      display: flex;
      justify-content: center;
    }
    .all-reviews-container {
      width: 100%;
      max-width: 800px;
    }
    .all-reviews-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .all-reviews-header h1 {
      font-family: var(--font-primary);
      font-size: 2rem;
      font-weight: 900;
      margin: 0;
    }
    .back-link {
      font-family: var(--font-primary);
      font-weight: 800;
      font-size: 0.95rem;
      color: var(--black);
      text-decoration: none;
      border: 2px solid var(--black);
      border-radius: 8px;
      padding: 0.5rem 1rem;
      box-shadow: 2px 2px 0 var(--black);
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .back-link:hover {
      transform: translate(-1.5px, -1.5px);
      box-shadow: 3.5px 3.5px 0 var(--black);
    }
    .loading-state, .empty-state {
      text-align: center;
      padding: 3rem;
      font-family: var(--font-secondary);
      font-size: 1.1rem;
      color: var(--gray-3);
    }
    .reviews-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .review-card {
      background: var(--white);
      border: 3px solid var(--black);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 4px 4px 0 var(--black);
      text-align: left;
    }
    .review-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .reviewer-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .reviewer-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid var(--black);
      overflow: hidden;
      flex-shrink: 0;
    }
    .reviewer-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-primary);
      font-weight: 900;
      background: var(--yellow);
      color: var(--black);
    }
    .reviewer-name {
      font-family: var(--font-primary);
      font-weight: 800;
      font-size: 1rem;
      color: var(--black);
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .reviewer-name:hover {
      color: var(--yellow);
      text-decoration: underline;
    }
    .review-date {
      font-family: var(--font-secondary);
      font-size: 0.8rem;
      color: var(--gray-3);
      white-space: nowrap;
    }
    .review-body p {
      font-family: var(--font-secondary);
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0;
      color: var(--black);
    }
    .seller-response {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--warning-light);
      border: 2px solid var(--black);
      border-radius: 8px;
      font-family: var(--font-secondary);
      font-size: 0.85rem;
    }
  `]
})
export class AllReviews implements OnInit {
  private route = inject(ActivatedRoute);
  private reviewService = inject(ReviewService);

  reviews = signal<Review[]>([]);
  loading = signal(true);
  userId = '';

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.userId = id;
        this.reviewService.getReviewsForUser(id).subscribe({
          next: (revs) => {
            this.reviews.set(this.formatReviews(revs));
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      }
    });
  }

  private formatReviews = formatReviews;
  getReviewerName = getReviewerName;
  getReviewerId = getReviewerId;
}
