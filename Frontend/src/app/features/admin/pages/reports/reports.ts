import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminReport } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { AdminTableSkeletonComponent } from '../../../../shared/components/admin-table-skeleton/admin-table-skeleton';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminErrorPanelComponent, AdminLoaderComponent, AdminTableSkeletonComponent, EmptyStateComponent, PaginationComponent],
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
  totalReports = signal(0);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  activeDropdownReportId = signal<string | null>(null);
  showDetailsModal = signal(false);
  detailsReport = signal<AdminReport | null>(null);

  searchText = signal('');
  filterStatus = signal<string>('pending');
  filterReason = signal<string>('');
  sortOrder = signal<'newest' | 'oldest'>('newest');

  readonly statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'dismissed', label: 'Dismissed' },
  ];

  readonly reasonOptions = [
    'Misleading description',
    'Counterfeit item',
    'Inappropriate content',
    'Scam / fraud',
    'Other',
  ];

  readonly metrics = computed(() => {
    const all = this.reports();
    const total = this.totalReports();
    const uniqueProducts = new Set(all.filter(r => r.productId).map(r => r.productId!.id)).size;
    const uniqueReporters = new Set(all.filter(r => r.reporterId).map(r => r.reporterId!.id)).size;
    return { total, uniqueProducts, uniqueReporters };
  });

  readonly filteredReports = computed(() => {
    let list = this.reports();
    const search = this.searchText().toLowerCase().trim();
    const status = this.filterStatus();
    const reason = this.filterReason();

    if (search) {
      list = list.filter(r => r.productId?.title.toLowerCase().includes(search));
    }
    if (status && status !== 'all') {
      list = list.filter(r => r.status === status);
    }
    if (reason) {
      list = list.filter(r => r.reason === reason);
    }
    if (this.sortOrder() === 'oldest') {
      list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return list;
  });

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
        this.totalReports.set(res.total);
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

  nextPage(): void {
    this.pagination.nextPage();
    this.loadReports();
  }

  prevPage(): void {
    this.pagination.prevPage();
    this.loadReports();
  }

  goToPage(page: number): void {
    this.pagination.goToPage(page);
    this.loadReports();
  }

  toggleDropdown(reportId: string, event: Event): void {
    event.stopPropagation();
    if (this.activeDropdownReportId() === reportId) {
      this.activeDropdownReportId.set(null);
    } else {
      this.activeDropdownReportId.set(reportId);
    }
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.activeDropdownReportId.set(null);
  }

  onSearchInput(value: string): void {
    this.searchText.set(value);
    this.pagination.goToPage(1);
  }

  onFilterChange(): void {
    this.pagination.goToPage(1);
  }

  resetFilters(): void {
    this.searchText.set('');
    this.filterStatus.set('pending');
    this.filterReason.set('');
    this.sortOrder.set('newest');
    this.pagination.goToPage(1);
  }

  openDetailsModal(report: AdminReport): void {
    this.detailsReport.set(report);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.detailsReport.set(null);
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
