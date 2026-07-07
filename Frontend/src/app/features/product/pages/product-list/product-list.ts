import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { ProductSummary } from '../../../../core/models/product.model';
import { LocationService } from '../../../../core/services/location.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { AuthRequiredModalComponent } from '../../../../shared/components/auth-required-modal/auth-required-modal';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ChangeLocationModalComponent } from '../../../../shared/components/change-location-modal/change-location-modal';
import { LocationProximity } from '../../../../shared/components/location-badge/location-badge';

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'location';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, PaginationComponent, AuthRequiredModalComponent, EmptyStateComponent, ChangeLocationModalComponent],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductList implements OnInit {
  protected productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  protected authService = inject(AuthService);
  wishlistService = inject(WishlistService);
  protected locationService = inject(LocationService);

  Math = Math;
  showAuthModal = false;
  showLocationModal = false;

  browsingGovernorate = '';
  browsingCity = '';
  browsingDistrict = '';
  locationLabel = signal('');

  // ── Raw data ───────────────────────────────────────────────────────────
  private allProducts: ProductSummary[] = [];

  // ── Displayed (after filters + sort) ──────────────────────────────────
  products: ProductSummary[] = [];
  totalCount = 0;
  filteredCount = 0;
  isLoading = true;
  viewMode: 'grid' | 'list' = 'grid';

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    this.cdr.detectChanges();
  }

  // ── Pagination state ───────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 12;
  totalPages = 1;
  pagesArray: number[] = [];

  // ── Filter state ───────────────────────────────────────────────────────
  categories: string[] = [];
  selectedCategories: Set<string> = new Set();

  conditionOptions = ['New w/ Tags', 'Excellent', 'Good', 'Fair', 'Distressed'];
  selectedConditions: Set<string> = new Set();

  minPrice = 0;
  maxPrice = 100000;

  // ── Sort state ─────────────────────────────────────────────────────────
  sortOpen = false;
  selectedSort: SortOption = 'relevance';

  sortLabels: Record<SortOption, string> = {
    relevance: 'RELEVANCE',
    price_asc: 'PRICE: LOW TO HIGH',
    price_desc: 'PRICE: HIGH TO LOW',
    newest: 'NEWEST ARRIVALS',
    location: 'NEAR YOU',
  };

  sortKeys: SortOption[] = ['relevance', 'price_asc', 'price_desc', 'newest', 'location'];

  // Track if mobile filter panel is expanded
  mobileFiltersOpen = false;

  get selectedSortLabel(): string {
    return this.sortLabels[this.selectedSort];
  }

  // ── Location ───────────────────────────────────────────────────────────
  getProximity(product: ProductSummary): LocationProximity {
    const user = this.authService.currentUser();
    if (!user || !this.browsingGovernorate) return 'other';
    const pGov = product.sellerGovernorate;
    const pCity = product.sellerCity;
    const pDist = product.sellerDistrict;
    if (!pGov) return 'other';
    if (this.browsingDistrict && pDist && this.browsingDistrict === pDist) return 'same_district';
    if (this.browsingCity && pCity && this.browsingCity === pCity) return 'same_city';
    if (this.browsingGovernorate === pGov) return 'same_governorate';
    return 'other';
  }

  openLocationModal(): void {
    this.showLocationModal = true;
  }

  closeLocationModal(): void {
    this.showLocationModal = false;
  }

  onLocationSaved(location: { governorate: string; city: string; district: string }): void {
    this.browsingGovernorate = location.governorate;
    this.browsingCity = location.city;
    this.browsingDistrict = location.district;
    this.updateLocationLabel();
    this.applyFilters();
    this.closeLocationModal();
  }

  private locationLabelSeq = 0;

  private updateLocationLabel(): void {
    if (!this.browsingGovernorate) {
      this.locationLabel.set('');
      return;
    }
    const seq = ++this.locationLabelSeq;
    this.locationService.getGovernorateName(this.browsingGovernorate).subscribe(govName => {
      if (seq !== this.locationLabelSeq) return;
      let label = govName || this.browsingGovernorate;
      if (this.browsingCity) {
        this.locationService.getCityName(this.browsingGovernorate, this.browsingCity).subscribe(cityName => {
          if (seq !== this.locationLabelSeq) return;
          label += `, ${cityName || this.browsingCity}`;
          this.locationLabel.set(label);
        });
      } else {
        this.locationLabel.set(label);
      }
    });
  }

  getShortLocationLabel(): string {
    const label = this.locationLabel();
    if (!label) return '';
    const parts = label.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim(); // Get only the city part
    }
    return label;
  }

  hasActiveFilters(): boolean {
    return this.selectedCategories.size > 0 ||
           this.selectedConditions.size > 0 ||
           this.minPrice > 0 ||
           this.maxPrice < 100000;
  }

  private locationSort(products: ProductSummary[], governorate: string, city?: string, district?: string): ProductSummary[] {
    const score = (p: ProductSummary): number => {
      const pGov = p.sellerGovernorate;
      const pCity = p.sellerCity;
      const pDist = p.sellerDistrict;
      if (!pGov) return 0;
      if (district && pDist && district === pDist) return 4;
      if (city && pCity && city === pCity) return 3;
      if (governorate === pGov) return 2;
      return 1;
    };
    return products.sort((a, b) => score(b) - score(a));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    // 1. Init browsing location from user profile
    const user = this.authService.currentUser();
    if (user) {
      this.browsingGovernorate = user.governorate || '';
      this.browsingCity = user.city || '';
      this.browsingDistrict = user.district || '';
      this.updateLocationLabel();
      if (this.browsingGovernorate) {
        this.selectedSort = 'location';
      }
    }

    // 2. Fetch backend categories
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
        // const mapped = apiProducts.map(p => {
        //   const conditionLabel = this.productService.conditionLabels[p.condition] || p.condition;
        //   return {
        //     id: p.id,
        //     name: p.title,
        //     brand: p.brand || 'ARCHIVE',
        //     price: p.price,
        //     desc: '',
        //     image: p.thumbnail || 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=800&auto=format&fit=crop',
        //     badge: p.badge || '',
        //     size: (p as any).size || 'OS',
        //     condition: conditionLabel,
        //     conditionScore: p.conditionScore ? `${p.conditionScore}/10` : '8.0/10',
        //     sku: p.id.substring(0, 8).toUpperCase(),
        //     categoryName: (p as any).categoryName || '',
        //     soldByNafa3ni: p.soldByNafa3ni
        //   };
        // });

        this.isLoading = false;
        this.allProducts = apiProducts;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.isLoading = false;
        this.allProducts = [];
        this.applyFilters();
        this.cdr.detectChanges();
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

  // ── Filter chips state ────────────────────────────────────────────────
  openChipDropdown: string | null = null;

  // ── Apply Filters + Sort + Load-more ─────────────────────────────────
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

    // Filter by condition (match against condition label)
    if (this.selectedConditions.size > 0) {
      result = result.filter(p => {
        const label = this.productService.conditionLabels[p.condition] || p.condition;
        return this.selectedConditions.has(label);
      });
    }

    // Filter by price
    result = result.filter(p => p.price >= this.minPrice && p.price <= this.maxPrice);

    // Sort
    switch (this.selectedSort) {
      case 'price_asc': result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'location': {
        if (this.browsingGovernorate) {
          result = this.locationSort(result, this.browsingGovernorate, this.browsingCity, this.browsingDistrict);
        }
        break;
      }
      default: break; // relevance = original order
    }

    // Update metadata
    this.totalCount = result.length;
    this.filteredCount = result.length;
    this.totalPages = Math.ceil(result.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    this.pagesArray = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pagesArray.push(i);
    }

    // Paginate: show only the current page's items
    const start = (this.currentPage - 1) * this.pageSize;
    this.products = result.slice(start, start + this.pageSize);

    this.sortOpen = false;
    this.mobileFiltersOpen = false;
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

  // ── Filter Chips ──────────────────────────────────────────────────────
  toggleChipDropdown(name: string): void {
    this.openChipDropdown = this.openChipDropdown === name ? null : name;
  }

  closeChipDropdowns(): void {
    this.openChipDropdown = null;
  }

  selectChipCategory(cat: string): void {
    this.selectedCategories.clear();
    this.selectedCategories.add(cat);
    this.currentPage = 1;
    this.openChipDropdown = null;
    this.applyFilters();
  }

  resetCategoryFilter(): void {
    this.selectedCategories.clear();
    this.currentPage = 1;
    this.applyFilters();
  }

  selectChipCondition(cond: string): void {
    if (this.selectedConditions.has(cond)) {
      this.selectedConditions.delete(cond);
    } else {
      this.selectedConditions.add(cond);
    }
    this.currentPage = 1;
    this.applyFilters();
  }

  applyChipPrice(): void {
    this.currentPage = 1;
    this.openChipDropdown = null;
    this.applyFilters();
  }

  // ── Reset Filters ─────────────────────────────────────────────────────
  resetFilters(): void {
    this.selectedCategories.clear();
    this.selectedConditions.clear();
    this.minPrice = 0;
    this.maxPrice = 100000;
    this.selectedSort = 'relevance';
    this.currentPage = 1;
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

  toggleMobileFilters(): void {
    this.mobileFiltersOpen = !this.mobileFiltersOpen;
  }

}
