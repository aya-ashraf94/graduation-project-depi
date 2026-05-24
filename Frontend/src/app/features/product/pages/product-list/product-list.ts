import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';

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
  private cdr = inject(ChangeDetectorRef);

  // ── Raw data ───────────────────────────────────────────────────────────
  private allProducts: Product[] = [];

  // ── Displayed (after filters + sort) ──────────────────────────────────
  products: Product[] = [];
  isLoading = true;

  // ── Filter state ───────────────────────────────────────────────────────
  categories: string[] = [];
  selectedCategory = '';   // '' = all

  conditionOptions = ['New w/ Tags', 'Excellent', 'Good', 'Tarnished', 'Distressed'];
  selectedConditions: Set<string> = new Set();

  minPrice = 0;
  maxPrice = 15000;

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

    const startTime = Date.now();

    // 2. Fetch products dynamically
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
    this.selectedCategory = this.selectedCategory === category ? '' : category;
  }

  // ── Condition ─────────────────────────────────────────────────────────
  toggleCondition(condition: string): void {
    if (this.selectedConditions.has(condition)) {
      this.selectedConditions.delete(condition);
    } else {
      this.selectedConditions.add(condition);
    }
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
    this.applyFilters();
  }

  // ── Apply Filters + Sort ──────────────────────────────────────────────
  applyFilters(): void {
    let result = [...this.allProducts];

    // Filter by category
    if (this.selectedCategory) {
      result = result.filter(p => p.categoryName === this.selectedCategory);
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

    this.products = result;
    this.sortOpen = false;
    this.mobileFiltersOpen = false; // Auto-close drawer on apply
    this.cdr.detectChanges();
  }

  resetFilters(): void {
    this.selectedCategory  = '';
    this.selectedConditions.clear();
    this.minPrice = 0;
    this.maxPrice = 15000;
    this.selectedSort = 'relevance';
    this.applyFilters();
  }

  toggleMobileFilters(): void {
    this.mobileFiltersOpen = !this.mobileFiltersOpen;
  }
}
