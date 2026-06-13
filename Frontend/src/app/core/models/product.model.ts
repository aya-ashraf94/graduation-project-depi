// ============================================================
// PRODUCT MODELS
// Core types for all buy/sell listings on the marketplace.
// ============================================================

import { UserSummary } from './user.model';

export type ProductCondition =
  | 'new_with_tags'
  | 'excellent'
  | 'good'
  | 'fair'
  | 'distressed';

export type ProductStatus = 'available' | 'reserved' | 'sold' | 'draft';

export type ProductCategory =
  | 'outerwear'
  | 'tops'
  | 'bottoms'
  | 'footwear'
  | 'accessories'
  | 'electronics'
  | 'furniture'
  | 'books'
  | 'sports'
  | 'other';

export interface Product {
  id: string;
  title: string;
  brand: string;
  description: string;
  price: number;
  condition: ProductCondition;
  conditionScore: number;   // 0–10
  category: ProductCategory;
  size?: string;
  sku?: string;
  images: string[];         // first image = thumbnail
  badge?: string;           // e.g. "RARE ARCHIVE", "HOT DEAL"
  status: ProductStatus;
  seller: UserSummary;
  viewCount: number;
  favoriteCount: number;
  soldByNafa3ni?: boolean;
  isVerified?: boolean;
  categoryName?: string;

  location?: string;
  phoneNumber?: string;
  showContactInfo?: boolean;
  categoryId?: string;

  /** Raw dynamicAttributes from the backend (preserved for edit forms) */
  rawDynamicAttributes?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

/** Lightweight card version — used in lists, search results */
export interface ProductSummary {
  id: string;
  title: string;
  brand: string;
  price: number;
  condition: ProductCondition;
  conditionScore: number;
  category: ProductCategory;
  thumbnail: string;        // first image
  badge?: string;
  status: ProductStatus;
  sellerId: string;
  createdAt: Date;
  size?: string;
  categoryName?: string;
  soldByNafa3ni?: boolean;
  isVerified?: boolean;
  location?: string;
}

/** Payload to create a new listing */
export interface CreateProductRequest {
  title: string;
  brand: string;
  description: string;
  price: number;
  condition: ProductCondition;
  conditionScore: number;
  category: ProductCategory;
  size?: string;
  images: string[];

  location?: string;
  phoneNumber?: string;
  showContactInfo?: boolean;
}

/** Payload to update an existing listing */
// export interface UpdateProductRequest extends Partial<CreateProductRequest> {
//   status?: ProductStatus;
// }

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  status?: ProductStatus;

  location?: string;
  phoneNumber?: string;
  showContactInfo?: boolean;

  categoryId?: string;

  /** Raw dynamicAttributes to send as-is (bypasses typed field mapping) */
  dynamicAttributes?: Record<string, any>;
}

/** Filters for the product listing page */
export interface ProductFilters {
  category?: ProductCategory;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  limit?: number;
}

/** Human-readable label map for condition values */
export const CONDITION_LABELS: Record<ProductCondition, string> = {
  new_with_tags: 'New w/ Tags',
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  distressed: 'Distressed',
};

/** Human-readable label map for category values */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  outerwear: 'Outerwear',
  tops: 'Tops',
  bottoms: 'Bottoms',
  footwear: 'Footwear',
  accessories: 'Accessories',
  electronics: 'Electronics',
  furniture: 'Furniture',
  books: 'Books',
  sports: 'Sports',
  other: 'Other',
};
