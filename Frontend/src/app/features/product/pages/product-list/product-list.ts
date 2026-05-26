import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import { WishlistService } from '../../../../core/services/wishlist.service';

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  desc: string;
  image: string;
  badge: string;
  size: string;
  condition: string;
  conditionScore: string;
  sku: string;
  categoryName?: string;
}

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  wishlistService = inject(WishlistService);

  showAuthModal = false;

  // ── Raw data ───────────────────────────────────────────────────────────
  private allProducts: Product[] = [];

  // ── Displayed (after filters + sort) ──────────────────────────────────
  products: Product[] = [];
  isLoading = true;

  // ── Pagination state ───────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 12;
  totalPages = 1;
  pagesArray: number[] = [];

  // ── Filter state ───────────────────────────────────────────────────────
  categories: string[] = [];
  selectedCategories: Set<string> = new Set();

  conditionOptions = ['New w/ Tags', 'Excellent', 'Good', 'Tarnished', 'Distressed'];
  selectedConditions: Set<string> = new Set();

  minPrice = 0;
  maxPrice = 100000;

  // ── Sort state ─────────────────────────────────────────────────────────
  sortOpen = false;
  selectedSort: SortOption = 'relevance';

  sortLabels: Record<SortOption, string> = {
    relevance:  'RELEVANCE',
    price_asc:  'PRICE: LOW TO HIGH',
    price_desc: 'PRICE: HIGH TO LOW',
    newest:     'NEWEST ARRIVALS',
  };

  sortKeys: SortOption[] = ['relevance', 'price_asc', 'price_desc', 'newest'];

  // Track if mobile filter panel is expanded
  mobileFiltersOpen = false;

  get selectedSortLabel(): string {
    return this.sortLabels[this.selectedSort];
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    // 1. Fetch backend categories
    this.productService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats.map(c => c.name);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching categories:', err);
        this.categories = ['Outerwear', 'Tops', 'Bottoms', 'Footwear', 'Accessories'];
        this.cdr.detectChanges();
      }
    });

    // 2. Subscribe to query params for category filtering from Home Page
    this.route.queryParams.subscribe(params => {
      const cat = params['category'];
      if (cat) {
        this.selectedCategories.clear();
        this.selectedCategories.add(cat);
        if (this.allProducts.length > 0) {
          this.applyFilters();
        }
      }
    });

    const startTime = Date.now();

    // 3. Fetch products dynamically
    this.productService.getProducts().subscribe({
      next: (apiProducts) => {
        const mapped = apiProducts.map(p => {
          const conditionLabel = this.productService.conditionLabels[p.condition] || p.condition;
          return {
            id: p.id,
            name: p.title,
            brand: p.brand || 'ARCHIVE',
            price: p.price,
            desc: '',
            image: p.thumbnail || 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=800&auto=format&fit=crop',
            badge: p.badge || '',
            size: (p as any).size || 'OS',
            condition: conditionLabel,
            conditionScore: p.conditionScore ? `${p.conditionScore}/10` : '8.0/10',
            sku: p.id.substring(0, 8).toUpperCase(),
            categoryName: (p as any).categoryName || ''
          };
        });

        const elapsed = Date.now() - startTime;
        const delayTime = Math.max(0, 400 - elapsed);

        setTimeout(() => {
          this.isLoading = false;
          this.allProducts = mapped;
          this.applyFilters();
          this.cdr.detectChanges();
        }, delayTime);
      },
      error: (err) => {
        console.error('Error loading products:', err);
        const elapsed = Date.now() - startTime;
        const delayTime = Math.max(0, 400 - elapsed);

        setTimeout(() => {
          this.isLoading = false;
          this.allProducts = [];
          this.applyFilters();
          this.cdr.detectChanges();
        }, delayTime);
      }
    });
  }

  // ── Category ──────────────────────────────────────────────────────────
  selectCategory(category: string): void {
    if (this.selectedCategories.has(category)) {
      this.selectedCategories.delete(category);
    } else {
      this.selectedCategories.add(category);
    }
    this.currentPage = 1; // Reset to first page
  }

  // ── Condition ─────────────────────────────────────────────────────────
  toggleCondition(condition: string): void {
    if (this.selectedConditions.has(condition)) {
      this.selectedConditions.delete(condition);
    } else {
      this.selectedConditions.add(condition);
    }
    this.currentPage = 1; // Reset to first page
  }

  isConditionSelected(condition: string): boolean {
    return this.selectedConditions.has(condition);
  }

  // ── Sort ──────────────────────────────────────────────────────────────
  toggleSort(): void {
    this.sortOpen = !this.sortOpen;
  }

  selectSort(sort: SortOption): void {
    this.selectedSort = sort;
    this.sortOpen = false;
    this.currentPage = 1; // Reset to first page
    this.applyFilters();
  }

  // ── Category Group Mapping Helper ────────────────────────────────────
  getCategoryFilterList(selectedCat: string): string[] {
    if (selectedCat === 'Electronics') {
      return ['Electronics', 'Mobiles', 'Laptops'];
    }
    if (selectedCat === 'Furniture') {
      return ['Furniture', 'Home Appliances'];
    }
    if (selectedCat === 'Other') {
      return ['Other', 'Sports & Fitness'];
    }
    return [selectedCat];
  }

  // ── Apply Filters + Sort + Paginate ──────────────────────────────────
  applyFilters(): void {
    let result = [...this.allProducts];

    // Filter by category group
    if (this.selectedCategories.size > 0) {
      const allowedCategories = new Set<string>();
      this.selectedCategories.forEach(cat => {
        this.getCategoryFilterList(cat).forEach(allowed => allowedCategories.add(allowed));
      });
      result = result.filter(p => allowedCategories.has(p.categoryName || ''));
    }

    // Filter by condition
    if (this.selectedConditions.size > 0) {
      result = result.filter(p => this.selectedConditions.has(p.condition));
    }

    // Filter by price
    result = result.filter(p => p.price >= this.minPrice && p.price <= this.maxPrice);

    // Sort
    switch (this.selectedSort) {
      case 'price_asc':  result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'newest':     result.sort((a, b) => b.id.localeCompare(a.id));       break;
      default:           break; // relevance = original order
    }

    // Update pagination metadata
    this.totalPages = Math.ceil(result.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    this.pagesArray = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pagesArray.push(i);
    }

    // Slice to current page
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.products = result.slice(startIndex, startIndex + this.pageSize);

    this.sortOpen = false;
    this.mobileFiltersOpen = false; // Auto-close drawer on apply
    this.cdr.detectChanges();
  }

  // ── Pagination Navigation Helpers ─────────────────────────────────────
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  resetFilters(): void {
    this.selectedCategories.clear();
    this.selectedConditions.clear();
    this.minPrice = 0;
    this.maxPrice = 100000;
    this.selectedSort = 'relevance';
    this.currentPage = 1; // Reset to page 1
    this.applyFilters();
  }

  toggleWishlist(productId: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.authService.currentUser()) {
      this.wishlistService.toggle(productId);
    } else {
      this.showAuthModal = true;
    }
  }

  closeAuthModal(): void {
    this.showAuthModal = false;
  }

  toggleMobileFilters(): void {
    this.mobileFiltersOpen = !this.mobileFiltersOpen;
  }
}
