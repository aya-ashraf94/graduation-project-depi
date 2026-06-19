import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService, AdminStats, AdminReport } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  stats = signal<AdminStats | null>(null);
  recentReports = signal<AdminReport[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
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
