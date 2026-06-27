import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';

import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminTableSkeletonComponent } from '../../../../shared/components/admin-table-skeleton/admin-table-skeleton';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, EmptyStateComponent, AdminErrorPanelComponent, AdminTableSkeletonComponent],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Orders implements OnInit {
  private adminService = inject(AdminService);

  orders = signal<any[]>([]);
  totalOrders = signal(0);
  currentPage = signal(1);
  pageSize = 20;
  totalPages = signal(0);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  statusFilter = signal<string>('');

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.adminService.getAllOrders(this.currentPage(), this.pageSize, this.statusFilter() || undefined).subscribe({
      next: (res) => {
        this.orders.set(res.orders);
        this.totalOrders.set(res.total);
        this.totalPages.set(res.pages);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        this.errorMessage.set('Failed to fetch orders.');
        this.isLoading.set(false);
      }
    });
  }

  onStatusFilterChange(): void {
    this.currentPage.set(1);
    this.loadOrders();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadOrders();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadOrders();
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `order-status-${status}`;
  }

  getPaymentLabel(method: string): string {
    const labels: Record<string, string> = {
      cash_on_delivery: 'Cash on Delivery',
      bank_transfer: 'Bank Transfer',
      online: 'Online'
    };
    return labels[method] || method;
  }

  statusOptions = ['pending', 'shipped', 'delivered', 'cancelled'];

  updateStatus(orderId: string, newStatus: string): void {
    this.adminService.updateOrderStatus(orderId, newStatus).subscribe({
      next: () => {
        this.orders.update(list =>
          list.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
        );
      },
      error: (err) => console.error('Failed to update order status:', err)
    });
  }
}