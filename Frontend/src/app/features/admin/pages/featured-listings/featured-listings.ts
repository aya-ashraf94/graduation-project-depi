import { Component, signal, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { exportToCsv } from '../../../../shared/utils/csv-export.utils';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-admin-featured-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, AdminLoaderComponent, AdminErrorPanelComponent, CurrencyFormatPipe],
  templateUrl: './featured-listings.html',
  styleUrl: './featured-listings.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturedListings implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  protected pagination = inject(PaginationService);

  featured = signal<any[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  summary = signal({ totalRevenue: 0, activePromotions: 0, totalPromotions: 0 });

  searchQuery = signal('');
  statusFilter = signal('');
  dateFrom = signal('');
  dateTo = signal('');

  statusOptions = ['active', 'expired'];

  private searchSubj = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.searchSubj.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.load());

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.searchSubj.next(value);
  }

  applyFilter(): void {
    this.pagination.goToPage(1);
    this.load();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.pagination.goToPage(1);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.pagination.isLoading.set(true);
    this.errorMessage.set(null);

    let params = new HttpParams()
      .set('page', this.pagination.currentPage().toString())
      .set('limit', this.pagination.pageSize().toString());

    if (this.searchQuery()) params = params.set('search', this.searchQuery());
    if (this.statusFilter()) params = params.set('status', this.statusFilter());
    if (this.dateFrom()) params = params.set('dateFrom', this.dateFrom());
    if (this.dateTo()) params = params.set('dateTo', this.dateTo());

    this.http.get<any>(`${environment.apiUrl}/admin/featured-listings`, { params }).subscribe({
      next: (res) => {
        this.featured.set(res.featured);
        this.pagination.setResult(res.total, res.pages);
        this.summary.set(res.summary);
        this.isLoading.set(false);
        this.pagination.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load featured listings.');
        this.isLoading.set(false);
        this.pagination.isLoading.set(false);
      }
    });
  }

  get activeRate(): string {
    const s = this.summary();
    if (!s.totalPromotions) return '0%';
    return Math.round((s.activePromotions / s.totalPromotions) * 100) + '%';
  }

  initials(name: string): string {
    return (name || '').slice(0, 2).toUpperCase();
  }

  exportCsv(): void {
    const header = ['Seller', 'Email', 'Product', 'Duration', 'Amount Paid', 'Start', 'End', 'Status'];
    const rows = this.featured().map(f => [
      f.seller?.name || 'Deleted',
      f.seller?.email || '',
      f.product?.title || 'Unknown',
      `${f.duration} days`,
      String(f.amountPaid ?? ''),
      new Date(f.startDate).toLocaleDateString(),
      new Date(f.endDate).toLocaleDateString(),
      f.isActive ? 'Active' : 'Expired',
    ]);
    exportToCsv(`featured-listings-${new Date().toISOString().slice(0, 10)}`, [header, ...rows]);
  }

  goToPage(page: number): void {
    this.pagination.goToPage(page);
    this.load();
  }

  nextPage(): void {
    this.pagination.nextPage();
    this.load();
  }

  prevPage(): void {
    this.pagination.prevPage();
    this.load();
  }
}
