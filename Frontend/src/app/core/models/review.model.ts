// ============================================================
// REVIEW MODELS
// Trust ratings between buyers and sellers after a transaction.
// ============================================================

export interface Review {
  id: string;
  orderId: string;
  reviewerId: any;          // who wrote the review (string or object with id/name/avatar)
  revieweeId: string;       // who received the review
  productId: any;           // string or object
  rating: number;           // 1–5
  comment: string;
  createdAt: Date | string;
  response?: string | null;
  reviewerName?: string;
  reviewerAvatar?: string;
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

/** Payload to submit a review after a completed order.
 *  The backend auto-derives revieweeId and productId from orderId. */
export interface CreateReviewRequest {
  orderId: string;
  rating: number;
  comment: string;
}
