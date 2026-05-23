import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { ProductSummary, ProductFilters, CATEGORY_LABELS, CONDITION_LABELS, ProductCategory, ProductCondition } from '../../../../core/models/product.model';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyFormatPipe, ImageFallbackDirective],
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
})
export class SearchResults implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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
      },
      error: (err) => {
        console.error('Error fetching search results:', err);
        this.results = []; // في حال حدوث خطأ، نجعل النتائج فارغة
        this.totalResults = 0;
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
}
