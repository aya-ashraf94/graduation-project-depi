import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PaginationService {
  readonly currentPage = signal(1);
  readonly totalPages = signal(0);
  readonly totalItems = signal(0);
  readonly pageSize = signal(15);
  readonly isLoading = signal(false);

  reset(): void {
    this.currentPage.set(1);
    this.totalPages.set(0);
    this.totalItems.set(0);
    this.isLoading.set(false);
  }

  setResult(total: number, pages: number): void {
    this.totalItems.set(total);
    this.totalPages.set(pages);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }
}
