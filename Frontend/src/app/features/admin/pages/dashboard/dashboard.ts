import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AdminService, AdminStats, AdminReport } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminErrorPanelComponent, AdminLoaderComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private http = inject(HttpClient);

  stats = signal<AdminStats | null>(null);
  recentReports = signal<AdminReport[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  // Category sale management
  categories = signal<any[]>([]);
  selectedCatId = signal<string>('');
  salePercent = signal<number>(0);
  saleFormStart = signal<string>('');
  saleFormEnd = signal<string>('');
  savingSale = signal(false);
  loadingCats = signal(false);

  get selectedCategory(): any {
    return this.categories().find(c => c.id === this.selectedCatId()) || null;
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
  }

  ngOnInit(): void {
    this.loadData();
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
    this.http.put(`${environment.apiUrl}/categories/${catId}/sale`, {
      discountPercent: pct,
      saleStart: this.saleFormStart() || null,
      saleEnd: this.saleFormEnd() || null,
    }).subscribe({
      next: (updated: any) => {
        this.categories.update(list => list.map(c => c.id === catId ? { ...c, ...updated } : c));
        this.toastService.success('Category sale updated.');
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
        this.toastService.success('Category sale cleared.');
        this.salePercent.set(0);
        this.saleFormStart.set('');
        this.saleFormEnd.set('');
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

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      stats: this.adminService.getStats(),
      reports: this.adminService.getReports()
    }).subscribe({
      next: ({ stats, reports }) => {
        this.stats.set(stats);
        this.recentReports.set(reports.slice(0, 5));
        this.isLoading.set(false);
        this.loadCategories();
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.errorMessage.set('Failed to load dashboard metrics.');
        this.isLoading.set(false);
      }
    });
  }

  dismissReport(id: string): void {
    this.confirmService.show({
      title: 'Dismiss Report',
      message: 'Are you sure you want to dismiss this report?',
      onConfirm: () => {
        this.adminService.deleteReport(id).subscribe({
          next: () => {
            this.recentReports.update(reports => reports.filter(r => r.id !== id));
            this.stats.update(s => s ? { ...s, openReports: Math.max(0, s.openReports - 1) } : null);
            this.adminService.refreshPendingCount();
            this.toastService.success('Report dismissed successfully.');
          },
          error: (err) => {
            console.error('Failed to dismiss report:', err);
            this.toastService.error('Failed to dismiss report. Please try again.');
          }
        });
      }
    });
  }

}
