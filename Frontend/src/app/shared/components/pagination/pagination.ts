import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalItems = input<number>(0);
  readonly label = input<string>('items');
  readonly variant = input<'icons' | 'text'>('icons');
  readonly isLoading = input<boolean>(false);

  readonly pageChange = output<number>();
  readonly prevPage = output<void>();
  readonly nextPage = output<void>();

  readonly pagesArray = computed(() => {
    const arr = [];
    const total = this.totalPages();
    for (let i = 1; i <= total; i++) {
      arr.push(i);
    }
    return arr;
  });

  onPrevPage(): void {
    if (this.currentPage() > 1 && !this.isLoading()) {
      this.prevPage.emit();
    }
  }

  onNextPage(): void {
    if (this.currentPage() < this.totalPages() && !this.isLoading()) {
      this.nextPage.emit();
    }
  }

  onPageClick(p: number): void {
    if (p !== this.currentPage() && !this.isLoading()) {
      this.pageChange.emit(p);
    }
  }
}
