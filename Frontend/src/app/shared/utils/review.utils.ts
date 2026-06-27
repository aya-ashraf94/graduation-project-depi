export function formatReviews(reviews: any[]): any[] {
  return (reviews || []).map(r => {
    if (!r.reviewerId || typeof r.reviewerId !== 'object') {
      r.reviewerId = { name: r.reviewerName || 'Campus Member', avatar: r.reviewerAvatar || '' };
    }
    return r;
  });
}

export function getReviewerName(review: any): string {
  return review.reviewerId?.name || review.reviewerName || 'Campus Member';
}

export function getReviewerId(review: any): string {
  return review.reviewerId?.id || review.reviewerId || '';
}
