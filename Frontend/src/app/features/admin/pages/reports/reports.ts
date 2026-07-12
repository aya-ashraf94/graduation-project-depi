import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, AdminReport } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminErrorPanelComponent, AdminLoaderComponent, PaginationComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Reports implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  protected pagination = inject(PaginationService);

  reports = signal<AdminReport[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  expandedDetails = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.isLoading.set(true);
    this.pagination.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getReports(this.pagination.currentPage(), this.pagination.pageSize()).subscribe({
      next: (res) => {
        this.reports.set(res.reports);
        this.pagination.setResult(res.total, res.pages);
        this.isLoading.set(false);
        this.pagination.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching reports:', err);
        this.errorMessage.set('Failed to fetch reported content queue.');
        this.isLoading.set(false);
        this.pagination.isLoading.set(false);
      }
    });
  }

  goToPage(page: number): void {
    this.pagination.goToPage(page);
    this.loadReports();
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
            this.adminService.refreshPendingCount();
            this.toastService.success('Report dismissed successfully.');
            this.loadReports();
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
            this.adminService.refreshPendingCount();
            this.toastService.success('Report resolved successfully.');
            this.loadReports();
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
    const msg = `WARNING: This will permanently DELETE this product listing from the marketplace. All reports for this listing will be auto-resolved. Continue?`;
    this.confirmService.show({
      title: 'Delete Flagged Product',
      message: msg,
      onConfirm: () => {
        this.adminService.deleteProduct(productId).subscribe({
          next: () => {
            this.adminService.refreshPendingCount();
            this.toastService.success('Flagged product deleted and reports resolved.');
            this.loadReports();
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
