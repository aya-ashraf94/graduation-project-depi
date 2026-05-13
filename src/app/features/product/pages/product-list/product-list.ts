import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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

  // ── Raw data ───────────────────────────────────────────────────────────
  private allProducts: Product[] = [
    { id: 'prod-001', name: 'Muted Moto Jacket 2018',    brand: 'ACNE STUDIOS',      price: 850,   desc: 'Architectural utility meets industrial aesthetics.',          image: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=800&auto=format&fit=crop', badge: '',            size: 'Size M',   condition: 'Excellent',    conditionScore: '9.0/10', sku: 'AS-MJ-2018'   },
    { id: 'prod-002', name: 'Riot Riot Riot Bomber Camo', brand: 'RAF SIMONS',        price: 12500, desc: 'High-contrast equipment for the modern digital workspace.',   image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop', badge: 'RARE ARCHIVE', size: 'Size L',   condition: 'Good',         conditionScore: '8.0/10', sku: 'RS-RRR-CAMO'  },
    { id: 'prod-003', name: '1955 501 XX Customized',     brand: "LEVI'S VINTAGE",    price: 450,   desc: 'Engineered for durability and functional performance.',       image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop', badge: '',            size: 'W32 L34',  condition: 'Distressed',   conditionScore: '7.5/10', sku: 'LV-501-1955'  },
    { id: 'prod-004', name: 'Geobasket Black/Milk',       brand: 'RICK OWENS',        price: 650,   desc: 'The essential tool for heavy-duty operational tasks.',        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop', badge: '',            size: 'EU 43',    condition: 'Excellent',    conditionScore: '9.5/10', sku: 'RO-GB-BLK'    },
    { id: 'prod-005', name: "Heavy ID Bracelet '11",      brand: 'MAISON MARGIELA',   price: 320,   desc: 'Precision instruments for technical environments.',           image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop', badge: '',            size: 'OS',       condition: 'Tarnished',    conditionScore: '6.5/10', sku: 'MM-AC-2011'   },
    { id: 'prod-006', name: 'Boiled Wool Sweater',        brand: 'COMME DES GARCONS', price: 580,   desc: 'Advanced thermal protection for cold climates.',             image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop', badge: '',            size: 'Size S',   condition: 'New w/ Tags',  conditionScore: '10/10',  sku: 'CDG-TP-004'   },
  ];

  // ── Displayed (after filters + sort) ──────────────────────────────────
  products: Product[] = [];

  // ── Filter state ───────────────────────────────────────────────────────
  categories = ['Outerwear', 'Tops', 'Bottoms', 'Footwear', 'Accessories'];
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

  get selectedSortLabel(): string {
    return this.sortLabels[this.selectedSort];
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.applyFilters();
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
  }

  resetFilters(): void {
    this.selectedCategory  = '';
    this.selectedConditions.clear();
    this.minPrice = 0;
    this.maxPrice = 15000;
    this.selectedSort = 'relevance';
    this.applyFilters();
  }
}
