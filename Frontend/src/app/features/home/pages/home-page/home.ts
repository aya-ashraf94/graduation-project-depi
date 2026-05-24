import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { ProductService } from '../../../../core/services/product.service';
import { ProductSummary } from '../../../../core/models/product.model';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyFormatPipe, ImageFallbackDirective],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  departments = [
    {
      name: 'Electronics & Gadgets',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
    },
    {
      name: 'Furniture & Home',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18v11H3z"/><path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="M8 21v-4"/><path d="M16 21v-4"/><path d="M3 14h18"/></svg>`,
    },
    {
      name: 'Clothing & Apparel',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a8.5 8.5 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
    },
    {
      name: 'Books & Media',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    },
    {
      name: 'Vintage & Collectibles',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>`,
    },
  ];

  featuredProducts: ProductSummary[] = [];

  features = [
    {
      title: 'Trusted Community',
      desc: 'Trade with neighbors and verified community members safely.',
      icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    },
    {
      title: 'Easy Swaps',
      desc: 'Simple, direct exchanges to turn your unwanted items into fresh finds.',
      icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    },
    {
      title: 'Direct Chat',
      desc: 'Message users instantly to negotiate prices and arrange meetups.',
      icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    },
    {
      title: 'Eco-Friendly',
      desc: 'Give items a second life and reduce waste in your local community.',
      icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    },
  ];

  stats = [
    { value: '5K+', label: 'Active Traders', highlight: false },
    { value: '10K+', label: 'Items Listed', highlight: true },
    { value: '24/7', label: 'Community Support', highlight: false },
  ];

  steps = [
    {
      title: 'Browse',
      desc: 'Search through thousands of secondhand items and hidden treasures in your area.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    },
    {
      title: 'Connect',
      desc: 'Chat with the owner, ask questions, and negotiate the perfect deal directly.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    },
    {
      title: 'Trade',
      desc: 'Meet up, exchange cash or items, and give pre-loved goods a new home.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Fetch a pool of latest products to select diverse featured items
    this.productService.getProducts({ limit: 20 }).subscribe({
      next: (products) => {
        const diverse: ProductSummary[] = [];
        const seenCategories = new Set<string>();

        // Pick one item from each distinct category first
        for (const product of products) {
          const cat = product.categoryName || '';
          if (cat && !seenCategories.has(cat)) {
            diverse.push(product);
            seenCategories.add(cat);
          }
          if (diverse.length === 4) break;
        }

        // If we still have fewer than 4 items, fill the rest with the latest products
        if (diverse.length < 4) {
          for (const product of products) {
            if (!diverse.some(p => p.id === product.id)) {
              diverse.push(product);
            }
            if (diverse.length === 4) break;
          }
        }

        this.featuredProducts = diverse;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching featured products:', err);
      }
    });

    // Fetch category counts dynamically from backend
    this.productService.getCategoryCounts().subscribe({
      next: (categoryCounts) => {
        const counts = {
          electronics: 0,
          furniture: 0,
          clothes: 0,
          books: 0,
          vintage: 0
        };

        categoryCounts.forEach((c: any) => {
          const catName = c.name || '';
          const count = c.count || 0;
          if (catName === 'Electronics' || catName === 'Mobiles' || catName === 'Laptops') {
            counts.electronics += count;
          } else if (catName === 'Furniture' || catName === 'Home Appliances') {
            counts.furniture += count;
          } else if (catName === 'Clothes') {
            counts.clothes += count;
          } else if (catName.toLowerCase().includes('book')) {
            counts.books += count;
          } else {
            counts.vintage += count;
          }
        });

        if (this.departments[0]) this.departments[0].count = `${counts.electronics} items`;
        if (this.departments[1]) this.departments[1].count = `${counts.furniture} items`;
        if (this.departments[2]) this.departments[2].count = `${counts.clothes} items`;
        if (this.departments[3]) this.departments[3].count = `${counts.books} items`;
        if (this.departments[4]) this.departments[4].count = `${counts.vintage} items`;

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching category counts:', err);
      }
    });
  }

  getDbCategoryName(name: string): string {
    const map: Record<string, string> = {
      'Electronics & Gadgets': 'Electronics',
      'Furniture & Home': 'Furniture',
      'Clothing & Apparel': 'Clothes',
      'Books & Media': 'Other',
      'Vintage & Collectibles': 'Other'
    };
    return map[name] || '';
  }

  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  toSafeHtml(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
