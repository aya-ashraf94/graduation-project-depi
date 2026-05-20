// ============================================================
// REVIEW MODELS
// Trust ratings between buyers and sellers after a transaction.
// ============================================================

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;       // who wrote the review
  revieweeId: string;       // who received the review
  productId: string;
  rating: number;           // 1–5
  comment: string;
  createdAt: Date;
}

/** Lightweight version for display in lists */
export interface ReviewSummary {
  id: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

/** Payload to submit a review after a completed order */
export interface CreateReviewRequest {
  orderId: string;
  revieweeId: string;
  productId: string;
  rating: number;
  comment: string;
}
