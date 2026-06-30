import { Component, signal, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AdminService, DashboardData } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyFormatPipe, AdminErrorPanelComponent, AdminLoaderComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  readonly Math = Math;
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private http = inject(HttpClient);

  data = signal<DashboardData | null>(null);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  // Category sale management
  showCategorySaleModal = signal(false);
  categories = signal<any[]>([]);
  selectedCatId = signal<string>('');
  salePercent = signal<number>(0);
  saleFormStart = signal<string>('');
  saleFormEnd = signal<string>('');
  saleStartDateVal = signal<string>('');
  saleStartTimeVal = signal<string>('00:00');
  saleEndDateVal = signal<string>('');
  saleEndTimeVal = signal<string>('23:59');
  savingSale = signal(false);
  loadingCats = signal(false);
  isDropdownOpen = signal(false);
  showGuide = signal(true);

  // Chart sizing
  maxRevenue = signal(0);
  barHeights = signal<number[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getDashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.computeChart(d.revenueHistory);
        this.isLoading.set(false);
        this.loadCategories();
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.errorMessage.set('Failed to load dashboard metrics.');
        this.isLoading.set(false);
      }
    });
  }

  private computeChart(history: { date: string; revenue: number }[]): void {
    const max = Math.max(...history.map(h => h.revenue), 1);
    this.maxRevenue.set(max);
    this.barHeights.set(history.map(h => (h.revenue / max) * 100));
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

  get weekLabel(): string {
    const h = this.data()?.recentOrders;
    return h && h.length > 0 ? 'Latest' : 'No orders';
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

  get selectedCategory(): any {
    return this.categories().find(c => c.id === this.selectedCatId()) || null;
  }

  get hasActiveCategorySales(): boolean {
    return this.categories().some(c => c.discountPercent > 0);
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
      this.saleStartDateVal.set(this.formatJustDate(startDt));
      this.saleStartTimeVal.set(this.formatJustTime(startDt));
    } else {
      this.saleStartDateVal.set('');
      this.saleStartTimeVal.set('00:00');
    }

    if (cat?.saleEnd) {
      const endDt = new Date(cat.saleEnd);
      this.saleEndDateVal.set(this.formatJustDate(endDt));
      this.saleEndTimeVal.set(this.formatJustTime(endDt));
    } else {
      this.saleEndDateVal.set('');
      this.saleEndTimeVal.set('23:59');
    }
  }

  loadCategories(): void {
    this.http.get<any[]>(`${environment.apiUrl}/categories`).subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.toastService.error('Failed to load categories.')
    });
  }

  saveCategorySale(): void {
    const catId = this.selectedCatId();
    if (!catId) return;
    this.savingSale.set(true);
    const pct = this.salePercent() > 0 ? this.salePercent() : null;

    const startIso = this.saleStartDateVal() && this.saleStartTimeVal() ? new Date(`${this.saleStartDateVal()}T${this.saleStartTimeVal()}`).toISOString() : null;
    const endIso = this.saleEndDateVal() && this.saleEndTimeVal() ? new Date(`${this.saleEndDateVal()}T${this.saleEndTimeVal()}`).toISOString() : null;

    this.http.put(`${environment.apiUrl}/categories/${catId}/sale`, {
      discountPercent: pct,
      saleStart: startIso,
      saleEnd: endIso,
    }).subscribe({
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

  clearCategorySale(): void {
    const catId = this.selectedCatId();
    if (!catId) return;
    this.savingSale.set(true);
    this.http.put(`${environment.apiUrl}/categories/${catId}/sale/clear`, {}).subscribe({
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

  private formatJustDate(d: Date): string {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  private formatJustTime(d: Date): string {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  dismissReport(id: string): void {
    this.confirmService.show({
      title: 'Dismiss Report',
      message: 'Are you sure you want to dismiss this report?',
      onConfirm: () => {
        this.adminService.deleteReport(id).subscribe({
          next: () => {
            const d = this.data();
            if (d) {
              d.stats.openReports = Math.max(0, d.stats.openReports - 1);
              this.data.set({ ...d });
            }
            this.adminService.refreshPendingCount();
            this.toastService.success('Report dismissed successfully.');
          },
          error: () => {
            this.toastService.error('Failed to dismiss report.');
          }
        });
      }
    });
  }
}
