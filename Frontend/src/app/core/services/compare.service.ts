import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';

const STORAGE_KEY = 'nafa3ni_compare_ids';
const HISTORY_KEY = 'nafa3ni_compare_history';
const EXPIRY_MS = 24 * 60 * 60 * 1000;

export interface CompareItem {
  id: string;
  thumbnail: string;
  title: string;
  price: number;
  addedAt: number;
}

export interface CompareHistoryEntry {
  ids: [string, string];
  titles: [string, string];
  thumbnails: [string, string];
  prices: [number, number];
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class CompareService {
  private toastService = inject(ToastService);
  private router = inject(Router);

  private readonly _compareItems = signal<CompareItem[]>([]);

  readonly count = computed(() => this._compareItems().length);
  readonly items = computed(() => this._compareItems());
  readonly ids = computed(() => this._compareItems().map(i => i.id));
  readonly isFull = computed(() => this._compareItems().length >= 2);

  constructor() {
    this._compareItems.set(this.loadFromStorage());
    effect(() => {
      const items = this._compareItems();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    });
  }

  saveToHistory(): void {
    const items = this._compareItems();
    if (items.length < 2) return;
    const history = this.getHistory();
    const exists = history.some(h =>
      (h.ids[0] === items[0].id && h.ids[1] === items[1].id) ||
      (h.ids[0] === items[1].id && h.ids[1] === items[0].id)
    );
    if (exists) return;
    const entry: CompareHistoryEntry = {
      ids: [items[0].id, items[1].id],
      titles: [items[0].title, items[1].title],
      thumbnails: [items[0].thumbnail, items[1].thumbnail],
      prices: [items[0].price, items[1].price],
      createdAt: Date.now(),
    };
    history.unshift(entry);
    if (history.length > 20) history.length = 20;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  getHistory(): CompareHistoryEntry[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  removeHistoryEntry(index: number): void {
    const history = this.getHistory();
    if (index >= 0 && index < history.length) {
      history.splice(index, 1);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }

  clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
  }

  private loadFromStorage(): CompareItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const items: CompareItem[] = JSON.parse(stored);
      const now = Date.now();
      const valid = items.filter(i => now - i.addedAt < EXPIRY_MS);
      if (valid.length !== items.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      }
      return valid;
    } catch {
      return [];
    }
  }

  isCompared(productId: string): boolean {
    return this._compareItems().some(i => i.id === productId);
  }

  toggle(item: Omit<CompareItem, 'addedAt'>): boolean {
    const current = [...this._compareItems()];
    const index = current.findIndex(i => i.id === item.id);

    if (index >= 0) {
      current.splice(index, 1);
      this._compareItems.set(current);
      return false;
    }

    if (current.length >= 2) {
      this.toastService.show('You can compare only 2 products.', 'error');
      return false;
    }

    current.push({ ...item, addedAt: Date.now() });
    this._compareItems.set(current);
    return true;
  }

  add(item: Omit<CompareItem, 'addedAt'>): void {
    if (!this.isCompared(item.id)) {
      this.toggle(item);
    }
  }

  remove(productId: string): void {
    const current = this._compareItems().filter(i => i.id !== productId);
    this._compareItems.set(current);
  }

  swap(): void {
    const current = [...this._compareItems()];
    if (current.length < 2) return;
    [current[0], current[1]] = [current[1], current[0]];
    this._compareItems.set(current);
  }

  clear(): void {
    this._compareItems.set([]);
  }

  getShareUrl(): string {
    const ids = this._compareItems().map(i => i.id);
    if (ids.length === 0) return '';
    const base = this.router.url.split('?')[0];
    return `${window.location.origin}${base}?ids=${ids.join(',')}`;
  }

  copyShareLink(): void {
    const url = this.getShareUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.success('Comparison link copied!');
    }).catch(() => {
      this.toastService.error('Failed to copy link');
    });
  }

  private _navigating = false;

  navigateToCompare(): void {
    if (this._navigating) return;
    const items = this._compareItems();
    if (items.length < 2) return;
    this._navigating = true;
    this.router.navigate(['/products/compare'], { queryParams: { ids: items.map(i => i.id).join(',') } }).then(() => {
      this._navigating = false;
    }).catch(() => {
      this._navigating = false;
    });
  }
}
