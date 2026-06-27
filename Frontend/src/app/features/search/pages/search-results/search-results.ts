import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { ProductSummary, ProductFilters, CATEGORY_LABELS, CONDITION_LABELS, ProductCategory, ProductCondition } from '../../../../core/models/product.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { AuthRequiredModalComponent } from '../../../../shared/components/auth-required-modal/auth-required-modal';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, ProductCardComponent, AuthRequiredModalComponent],
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResults implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  protected authService = inject(AuthService);
  protected wishlistService = inject(WishlistService);

  showAuthModal = false;

  query = '';
  results: ProductSummary[] = [];
  totalResults = 0;

  // Filter state
  selectedCategory: ProductCategory | '' = '';
  selectedCondition: ProductCondition | '' = '';
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'popular' = 'newest';

  // Label maps for template
  readonly categoryLabels = CATEGORY_LABELS;
  readonly conditionLabels = CONDITION_LABELS;
  readonly categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];
  readonly conditions = Object.keys(CONDITION_LABELS) as ProductCondition[];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.query = params['q'] || '';
      this.selectedCategory = params['category'] || '';
      this.selectedCondition = params['condition'] || '';
      this.sortBy = params['sort'] || 'newest';
      this.performSearch();
    });
  }

  performSearch(): void {
    const filters: ProductFilters = {
      search: this.query,
      sortBy: this.sortBy,
    };
    if (this.selectedCategory) filters.category = this.selectedCategory;
    if (this.selectedCondition) filters.condition = this.selectedCondition;

    // التصحيح هنا: استخدام subscribe لاستقبال البيانات
    this.productService.getProducts(filters).subscribe({
      next: (data) => {
        this.results = data;
        this.totalResults = data.length;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching search results:', err);
        this.results = []; // في حال حدوث خطأ، نجعل النتائج فارغة
        this.totalResults = 0;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilters(): void {
    const queryParams: any = {};
    if (this.query) queryParams.q = this.query;
    if (this.selectedCategory) queryParams.category = this.selectedCategory;
    if (this.selectedCondition) queryParams.condition = this.selectedCondition;
    if (this.sortBy) queryParams.sort = this.sortBy;

    this.router.navigate(['/search'], { queryParams });
  }

  clearFilters(): void {
    this.selectedCategory = '';
    this.selectedCondition = '';
    this.sortBy = 'newest';
    this.applyFilters();
  }

  toggleWishlist(productId: string, event?: any): void {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.authService.currentUser()) {
      this.wishlistService.toggle(productId);
    } else {
      this.showAuthModal = true;
    }
  }

  closeAuthModal(): void {
    this.showAuthModal = false;
  }
}
