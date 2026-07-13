import { Component, signal, inject, OnInit, OnDestroy, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AdminService, DashboardData, RevenueOverview } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';

interface Category {
  id: string;
  name: string;
  discountPercent?: number;
  saleStart?: string;
  saleEnd?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyFormatPipe, AdminErrorPanelComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit, OnDestroy {
  readonly Math = Math;
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();
  private readonly POLL_INTERVAL = 30000;

  data = signal<DashboardData | null>(null);
  revenueOverview = signal<RevenueOverview | null>(null);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  lastLoadTime = signal<string | null>(null);
  refreshFlash = signal(false);

  // Category sale management
  showCategorySaleModal = signal(false);
  categories = signal<Category[]>([]);
  selectedCatId = signal<string>('');
  salePercent = signal<number>(0);
  saleFormStart = signal<string>('');
  saleFormEnd = signal<string>('');
  saleStartDateVal = signal<string>('');
  saleStartTimeVal = signal<string>('00:00');
  saleEndDateVal = signal<string>('');
  saleEndTimeVal = signal<string>('23:59');
  savingSale = signal(false);
  isDropdownOpen = signal(false);

  // Announcement broadcast
  showAnnounceModal = signal(false);
  announceTitle = '';
  announceBody = '';
  announceTarget = 'all';
  savingAnnounce = signal(false);

  // Fee management
  showFeeModal = signal(false);
  platformFeePercentInput = signal(0);
  codFeePercentInput = signal(0);
  savingFee = signal(false);

  // Chart sizing
  barHeights = signal<number[]>([]);

  // Health check
  dbConnected = signal(true);
  apiOnline = signal(true);
  appVersion = signal('');

  readonly palette = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

  get todayLabel(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  get lastUpdatedLabel(): string {
    const t = this.lastLoadTime();
    return t ? `Last updated ${t}` : 'Loading...';
  }

  get gridLines(): { pct: number; label: string }[] {
    return [
      { pct: 0, label: '100%' },
      { pct: 25, label: '75%' },
      { pct: 50, label: '50%' },
      { pct: 75, label: '25%' },
      { pct: 100, label: '0' },
    ];
  }

  catColor(i: number): string {
    return this.palette[i % this.palette.length];
  }

  catPercent(productCount: number): number {
    const d = this.data();
    if (!d) return 0;
    const total = d.stats.activeProducts ?? d.stats.totalProducts;
    return total ? parseFloat(((productCount / total) * 100).toFixed(1)) : 0;
  }

  ngOnInit(): void {
    this.startPolling();
  }

  private startPolling(): void {
    timer(0, this.POLL_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const silent = !!this.data();
        this.loadData(silent);
        this.checkHealth();
      });
  }

  private checkHealth(): void {
    this.http.get<{ status: string; database: string; version?: string }>(`${environment.apiUrl}/health`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (h) => {
        this.dbConnected.set(h.database === 'connected');
        this.apiOnline.set(h.status === 'healthy');
        if (h.version) this.appVersion.set(h.version);
      },
      error: () => {
        this.dbConnected.set(false);
        this.apiOnline.set(false);
      }
    });
  }

  refreshMetrics(): void {
    this.isLoading.set(true);
    this.refreshFlash.set(false);
    this.loadData(true, () => {
      this.refreshFlash.set(true);
      setTimeout(() => this.refreshFlash.set(false), 1200);
    });
  }

  loadData(silent = false, onSuccess?: () => void): void {
    if (!this.data() && !silent) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
    }

    this.adminService.getDashboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => {
        this.data.set(d);
        this.computeChart(d.revenueHistory);
        this.isLoading.set(false);
        this.lastLoadTime.set(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        if (!silent) { this.loadCategories(); }
        onSuccess?.();
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        if (!this.data()) {
          this.errorMessage.set('Failed to load dashboard metrics.');
        }
        this.isLoading.set(false);
      }
    });

    this.adminService.getRevenueOverview().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => this.revenueOverview.set(r),
      error: (err) => console.error('Error loading revenue overview:', err)
    });
  }

  private computeChart(history: { date: string; revenue: number; gross?: number; platformFees?: number }[]): void {
    const max = Math.max(...history.map(h => h.gross || h.revenue), 1);
    this.barHeights.set(history.map(h => ((h.gross || h.revenue) / max) * 100));
  }

  get latestRevenue(): number {
    const h = this.data()?.revenueHistory;
    return h && h.length > 0 ? h[h.length - 1].revenue : 0;
  }

  get revenueTrend(): number {
    const h = this.data()?.revenueHistory;
    if (!h || h.length < 7) return 0;
    const week1 = h.slice(-7).reduce((s, d) => s + d.revenue, 0);
    const week2 = h.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
    if (week2 === 0) return week1 > 0 ? 100 : 0;
    return Math.round(((week1 - week2) / week2) * 100);
  }

  get isTrendUp(): boolean {
    return this.revenueTrend >= 0;
  }

  get monthIsUp(): boolean {
    return (this.revenueOverview()?.monthChange ?? 0) >= 0;
  }

  // ── Category sale management ───────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-container')) {
      this.isDropdownOpen.set(false);
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update(v => !v);
  }

  selectCategory(catId: string): void {
    this.selectedCatId.set(catId);
    this.onCategorySelect();
    this.isDropdownOpen.set(false);
  }

  get selectedCategory(): Category | null {
    return this.categories().find(c => c.id === this.selectedCatId()) || null;
  }

  get hasActiveCategorySales(): boolean {
    return this.categories().some(c => (c.discountPercent ?? 0) > 0);
  }

  get isCategoryOnSale(): boolean {
    const cat = this.selectedCategory;
    if (!cat?.discountPercent) return false;
    const now = new Date();
    if (cat.saleStart && new Date(cat.saleStart) > now) return false;
    if (cat.saleEnd && new Date(cat.saleEnd) < now) return false;
    return true;
  }

  onCategorySelect(): void {
    const cat = this.selectedCategory;
    this.salePercent.set(cat?.discountPercent ? Number(cat.discountPercent) : 0);
    this.saleFormStart.set(cat?.saleStart ? this.formatDateForInput(cat.saleStart) : '');
    this.saleFormEnd.set(cat?.saleEnd ? this.formatDateForInput(cat.saleEnd) : '');

    if (cat?.saleStart) {
      const startDt = new Date(cat.saleStart);
      this.saleStartDateVal.set(this.formatJustDateUTC(startDt));
      this.saleStartTimeVal.set(this.formatJustTimeUTC(startDt));
    } else {
      this.saleStartDateVal.set('');
      this.saleStartTimeVal.set('00:00');
    }

    if (cat?.saleEnd) {
      const endDt = new Date(cat.saleEnd);
      this.saleEndDateVal.set(this.formatJustDateUTC(endDt));
      this.saleEndTimeVal.set(this.formatJustTimeUTC(endDt));
    } else {
      this.saleEndDateVal.set('');
      this.saleEndTimeVal.set('23:59');
    }
  }

  loadCategories(): void {
    this.http.get<Category[]>(`${environment.apiUrl}/categories`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.toastService.error('Failed to load categories.')
    });
  }

  saveCategorySale(): void {
    const catId = this.selectedCatId();
    if (!catId) return;
    this.savingSale.set(true);
    const pct = this.salePercent() > 0 ? this.salePercent() : null;

    const startIso = this.saleStartDateVal() && this.saleStartTimeVal() ? new Date(`${this.saleStartDateVal()}T${this.saleStartTimeVal()}:00.000Z`).toISOString() : null;
    const endIso = this.saleEndDateVal() && this.saleEndTimeVal() ? new Date(`${this.saleEndDateVal()}T${this.saleEndTimeVal()}:00.000Z`).toISOString() : null;

    this.http.put(`${environment.apiUrl}/categories/${catId}/sale`, {
      discountPercent: pct,
      saleStart: startIso,
      saleEnd: endIso,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated: any) => {
        this.categories.update(list => list.map(c => c.id === catId ? { ...c, ...updated } : c));
        this.toastService.success(`✅ ${updated.name || 'Category'} sale updated successfully.`);
        this.savingSale.set(false);
      },
      error: () => {
        this.toastService.error('Failed to update category sale.');
        this.savingSale.set(false);
      }
    });
  }

  openAnnounceModal(): void {
    this.announceTitle = '';
    this.announceBody = '';
    this.announceTarget = 'all';
    this.showAnnounceModal.set(true);
  }

  sendAnnouncement(): void {
    if (!this.announceTitle.trim() || !this.announceBody.trim()) {
      this.toastService.error('Title and body are required.');
      return;
    }
    this.savingAnnounce.set(true);
    this.http.post(`${environment.apiUrl}/admin/notifications/broadcast`, {
      title: this.announceTitle.trim(),
      body: this.announceBody.trim(),
      type: 'system',
      targetRole: this.announceTarget,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.toastService.success(res.message || 'Announcement sent!');
        this.savingAnnounce.set(false);
        this.showAnnounceModal.set(false);
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to send announcement.');
        this.savingAnnounce.set(false);
      }
    });
  }

  openFeeModal(): void {
    forkJoin([
      this.http.get<{ platformFeePercent: number }>(`${environment.apiUrl}/settings/platform-fee`),
      this.http.get<{ codFeePercent: number }>(`${environment.apiUrl}/settings/cod-fee`)
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: ([pfRes, codRes]) => {
        this.platformFeePercentInput.set(pfRes.platformFeePercent);
        this.codFeePercentInput.set(codRes.codFeePercent);
        this.showFeeModal.set(true);
      },
      error: () => {
        this.platformFeePercentInput.set(3);
        this.codFeePercentInput.set(0);
        this.showFeeModal.set(true);
      }
    });
  }

  saveFees(): void {
    const pf = this.platformFeePercentInput();
    const cf = this.codFeePercentInput();
    if (pf < 0 || pf > 100 || cf < 0 || cf > 100) {
      this.toastService.error('Fees must be between 0 and 100');
      return;
    }
    this.savingFee.set(true);
    forkJoin([
      this.http.put(`${environment.apiUrl}/settings/platform-fee`, { platformFeePercent: pf }),
      this.http.put(`${environment.apiUrl}/settings/cod-fee`, { codFeePercent: cf })
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success(`Platform fee: ${pf}% | COD fee: ${cf}%`);
        this.savingFee.set(false);
        this.showFeeModal.set(false);
      },
      error: () => {
        this.toastService.error('Failed to update fees.');
        this.savingFee.set(false);
      }
    });
  }

  clearCategorySale(): void {
    const catId = this.selectedCatId();
    if (!catId) return;
    this.savingSale.set(true);
    this.http.put(`${environment.apiUrl}/categories/${catId}/sale/clear`, {}).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated: any) => {
        this.categories.update(list => list.map(c => c.id === catId ? { ...c, ...updated } : c));
        this.toastService.success(`✅ ${updated.name || 'Category'} sale cleared successfully.`);
        this.salePercent.set(0);
        this.saleFormStart.set('');
        this.saleFormEnd.set('');
        this.saleStartDateVal.set('');
        this.saleStartTimeVal.set('00:00');
        this.saleEndDateVal.set('');
        this.saleEndTimeVal.set('23:59');
        this.savingSale.set(false);
      },
      error: () => {
        this.toastService.error('Failed to clear category sale.');
        this.savingSale.set(false);
      }
    });
  }

  formatDateForInput(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  }

  private formatJustDateUTC(d: Date): string {
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }

  private formatJustTimeUTC(d: Date): string {
    return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showFeeModal.set(false);
    this.showCategorySaleModal.set(false);
    this.showAnnounceModal.set(false);
  }

  @HostListener('document:keydown.control.enter')
  onCtrlEnter(): void {
    if (this.showFeeModal()) this.saveFees();
    else if (this.showAnnounceModal()) this.sendAnnouncement();
    else if (this.showCategorySaleModal()) this.saveCategorySale();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  svgLinePath(): string {
    const history = this.data()?.userGrowthHistory;
    if (!history || history.length === 0) return '';
    const max = Math.max(...history.map(h => h.count), 1);
    const stepX = 500 / (history.length - 1);
    return history.map((h, index) => {
      const x = index * stepX;
      const y = 75 - (h.count / max) * 70;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  svgAreaPath(): string {
    const linePath = this.svgLinePath();
    if (!linePath) return '';
    const history = this.data()?.userGrowthHistory;
    if (!history || history.length === 0) return '';
    const stepX = 500 / (history.length - 1);
    const lastX = (history.length - 1) * stepX;
    return `${linePath} L ${lastX.toFixed(1)} 80 L 0 80 Z`;
  }
}
