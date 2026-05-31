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

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getReports().subscribe({
      next: (data) => {
        this.reports.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching reports:', err);
        this.errorMessage.set('Failed to fetch reported content queue.');
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
            this.reports.update(list => list.filter(r => r._id !== id));
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

  deleteProduct(productId: string, reportId: string): void {
    const msg = `⚠️ WARNING: This will permanently DELETE this product listing from the marketplace. All other reports for this listing will also be cleaned up. Continue?`;
    this.confirmService.show({
      title: 'Delete Flagged Product',
      message: msg,
      onConfirm: () => {
        this.adminService.deleteProduct(productId).subscribe({
          next: () => {
            // Remove all reports pointing to this product from local state
            this.reports.update(list => list.filter(r => r.productId?._id !== productId));
            this.toastService.success('Flagged product deleted and reports dismissed.');
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
