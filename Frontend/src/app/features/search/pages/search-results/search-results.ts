import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, merge, of } from 'rxjs';
import { debounceTime, switchMap, map, catchError, takeUntil, take } from 'rxjs/operators';
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
export class SearchResults implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  protected authService = inject(AuthService);
  protected wishlistService = inject(WishlistService);

  private text$ = new Subject<string>();
  private immediate$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  showAuthModal = false;
  filterExpanded = false;
  loading = false;

  query = '';
  results: ProductSummary[] = [];
  totalResults = 0;

  selectedCategory: ProductCategory | '' = '';
  selectedCondition: ProductCondition | '' = '';
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'popular' = 'newest';

  readonly categoryLabels = CATEGORY_LABELS;
  readonly conditionLabels = CONDITION_LABELS;
  readonly categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];
  readonly conditions = Object.keys(CONDITION_LABELS) as ProductCondition[];

  ngOnInit() {
    const search$ = merge(
      this.text$.pipe(
        debounceTime(300),
        map(text => { this.query = text; return this.buildFilters(); })
      ),
      this.immediate$.pipe(
        map(() => this.buildFilters())
      )
    );

    search$.pipe(
      switchMap(filters => {
        this.loading = true;
        this.cdr.markForCheck();
        return this.productService.getProducts(filters).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.results = data;
      this.totalResults = data.length;
      this.loading = false;
      this.cdr.markForCheck();
    });

    this.route.queryParams.pipe(take(1)).subscribe(params => {
      this.query = params['q'] || '';
      this.selectedCategory = params['category'] || '';
      this.selectedCondition = params['condition'] || '';
      this.sortBy = params['sort'] || 'newest';
      this.syncUrl();
      this.immediate$.next();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildFilters(): ProductFilters {
    const filters: ProductFilters = { search: this.query, sortBy: this.sortBy };
    if (this.selectedCategory) filters.category = this.selectedCategory;
    if (this.selectedCondition) filters.condition = this.selectedCondition;
    return filters;
  }

  private syncUrl(): void {
    const qp: any = {};
    if (this.query) qp.q = this.query;
    if (this.selectedCategory) qp.category = this.selectedCategory;
    if (this.selectedCondition) qp.condition = this.selectedCondition;
    if (this.sortBy) qp.sort = this.sortBy;
    this.router.navigate(['/search'], { queryParams: qp, replaceUrl: true });
  }

  onQueryChange(value: string): void {
    this.text$.next(value);
  }

  applyFilters(): void {
    this.syncUrl();
    this.immediate$.next();
  }

  toggleFilters(): void {
    this.filterExpanded = !this.filterExpanded;
  }

  clearFilters(): void {
    this.selectedCategory = '';
    this.selectedCondition = '';
    this.sortBy = 'newest';
    this.syncUrl();
    this.immediate$.next();
  }

  browseAll(): void {
    this.query = '';
    this.selectedCategory = '';
    this.selectedCondition = '';
    this.sortBy = 'newest';
    this.router.navigate(['/search'], { replaceUrl: true });
    this.immediate$.next();
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
