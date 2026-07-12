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
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, AdminLoaderComponent, AdminErrorPanelComponent, CurrencyFormatPipe],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Subscriptions implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  protected pagination = inject(PaginationService);

  transactions = signal<any[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  summary = signal({ activeSubscriptions: 0, totalRevenue: 0, totalRefunds: 0 });
  tiers = signal<string[]>([]);

  searchQuery = signal('');
  tierFilter = signal('');
  statusFilter = signal('');
  dateFrom = signal('');
  dateTo = signal('');

  statusOptions = ['completed', 'failed', 'refunded', 'pending'];
  billingCycleOptions = ['monthly', 'yearly'];

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
    this.tierFilter.set('');
    this.statusFilter.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.pagination.goToPage(1);
    this.load();
  }

  selectedTier: string = '';
  selectedStatus: string = '';

  load(): void {
    this.isLoading.set(true);
    this.pagination.isLoading.set(true);
    this.errorMessage.set(null);

    let params = new HttpParams()
      .set('page', this.pagination.currentPage().toString())
      .set('limit', this.pagination.pageSize().toString());

    if (this.searchQuery()) params = params.set('search', this.searchQuery());
    if (this.tierFilter()) params = params.set('tier', this.tierFilter());
    if (this.statusFilter()) params = params.set('status', this.statusFilter());
    if (this.dateFrom()) params = params.set('dateFrom', this.dateFrom());
    if (this.dateTo()) params = params.set('dateTo', this.dateTo());

    this.http.get<any>(`${environment.apiUrl}/admin/subscription-transactions`, { params }).subscribe({
      next: (res) => {
        this.transactions.set(res.transactions);
        this.pagination.setResult(res.total, res.pages);
        this.summary.set(res.summary);
        if (res.tiers && res.tiers.length) this.tiers.set(res.tiers);
        this.isLoading.set(false);
        this.pagination.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load subscription transactions.');
        this.isLoading.set(false);
        this.pagination.isLoading.set(false);
      }
    });
  }

  get mrr(): number {
    const s = this.summary();
    return Math.round((s.totalRevenue / 12) * 100) / 100;
  }

  exportCsv(): void {
    const header = ['User', 'Email', 'Tier', 'Amount', 'Cycle', 'Status', 'Date'];
    const rows = this.transactions().map(t => [
      t.user?.name || 'Deleted',
      t.user?.email || '',
      t.tierName,
      String(t.amount ?? ''),
      t.billingCycle || '',
      t.status || '',
      new Date(t.createdAt).toLocaleDateString(),
    ]);
    exportToCsv(`subscriptions-${new Date().toISOString().slice(0, 10)}`, [header, ...rows]);
  }

  initials(name: string): string {
    return (name || '').slice(0, 2).toUpperCase();
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
