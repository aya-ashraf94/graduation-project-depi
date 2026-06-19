import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, AdminReport } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  reports = signal<AdminReport[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  expandedDetails = signal<Set<string>>(new Set());

  // Pagination
  currentPage = signal(1);
  pageSize = 10;
  paginatedReports = signal<AdminReport[]>([]);

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getReports().subscribe({
      next: (data) => {
        this.reports.set(data);
        this.currentPage.set(1);
        this.updatePaginated();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching reports:', err);
        this.errorMessage.set('Failed to fetch reported content queue.');
        this.isLoading.set(false);
      }
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.reports().length / this.pageSize));
  }

  updatePaginated(): void {
    const start = (this.currentPage() - 1) * this.pageSize;
    this.paginatedReports.set(this.reports().slice(start, start + this.pageSize));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage.set(page);
    this.updatePaginated();
  }

  toggleDetails(id: string): void {
    this.expandedDetails.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  dismissReport(id: string): void {
    this.confirmService.show({
      title: 'Dismiss Report',
      message: 'Are you sure you want to dismiss this report?',
      onConfirm: () => {
        this.adminService.deleteReport(id).subscribe({
          next: () => {
            this.reports.update(list => list.filter(r => r.id !== id));
            this.updatePaginated();
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

  resolveReport(id: string): void {
    this.confirmService.show({
      title: 'Resolve Report',
      message: 'Mark this report as resolved? This indicates appropriate action has been taken.',
      onConfirm: () => {
        this.adminService.resolveReport(id).subscribe({
          next: () => {
            this.reports.update(list => list.filter(r => r.id !== id));
            this.updatePaginated();
            this.adminService.refreshPendingCount();
            this.toastService.success('Report resolved successfully.');
          },
          error: (err) => {
            console.error('Failed to resolve report:', err);
            this.toastService.error('Failed to resolve report. Please try again.');
          }
        });
      }
    });
  }

  deleteProduct(productId: string): void {
    const msg = `⚠️ WARNING: This will permanently DELETE this product listing from the marketplace. All reports for this listing will be auto-resolved. Continue?`;
    this.confirmService.show({
      title: 'Delete Flagged Product',
      message: msg,
      onConfirm: () => {
        this.adminService.deleteProduct(productId).subscribe({
          next: () => {
            this.reports.update(list => list.filter(r => r.productId?.id !== productId));
            this.updatePaginated();
            this.adminService.refreshPendingCount();
            this.toastService.success('Flagged product deleted and reports resolved.');
          },
          error: (err) => {
            console.error('Failed to delete reported product:', err);
            this.toastService.error('Failed to delete product. Please try again.');
          }
        });
      }
    });
  }
}
