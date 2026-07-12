import { Component, signal, inject, OnInit, ChangeDetectionStrategy, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AdminService } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { PaginationService } from '../../../../shared/services/pagination.service';

import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminTableSkeletonComponent } from '../../../../shared/components/admin-table-skeleton/admin-table-skeleton';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { exportToCsv } from '../../../../shared/utils/csv-export.utils';
import { ADMIN_STATUS_OPTIONS } from '../../../../shared/utils/admin.utils';

type SortKey = 'price' | 'date' | 'status' | 'buyer' | 'seller' | 'fee';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, EmptyStateComponent, AdminErrorPanelComponent, AdminTableSkeletonComponent, AdminLoaderComponent, CurrencyFormatPipe],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Orders implements OnInit {
  private adminService = inject(AdminService);
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  protected pagination = inject(PaginationService);

  orders = signal<any[]>([]);
  totalOrders = signal(0);
  totalGrossRevenue = signal(0);
  totalPlatformFees = signal(0);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  statusFilter = signal<string>('');
  searchQuery = signal('');
  expandedOrderId = signal<string | null>(null);
  showDisputeModal = signal(false);
  disputeOrderId = signal<string | null>(null);
  disputeResolution = signal<'seller_fault' | 'buyer_fault'>('seller_fault');
  disputeNote = signal('');
  savingDispute = signal(false);

  sortKey = signal<SortKey | null>(null);
  sortAsc = signal(true);

  filteredOrders = computed(() => {
    let list = this.orders();
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(o =>
        o.id?.toLowerCase().includes(q) ||
        o.productId?.title?.toLowerCase().includes(q) ||
        o.buyerId?.name?.toLowerCase().includes(q) ||
        o.sellerId?.name?.toLowerCase().includes(q) ||
        o.buyerId?.email?.toLowerCase().includes(q) ||
        o.sellerId?.email?.toLowerCase().includes(q)
      );
    }
    const sk = this.sortKey();
    if (sk) {
      const dir = this.sortAsc() ? 1 : -1;
      list = [...list].sort((a, b) => {
        const getVal = (o: any): number | string => {
          switch (sk) {
            case 'price': return o.price ?? 0;
            case 'fee': return o.platformFee ?? 0;
            case 'date': return o.createdAt ?? '';
            case 'status': return o.status ?? '';
            case 'buyer': return (o.buyerId?.name ?? '').toLowerCase();
            case 'seller': return (o.sellerId?.name ?? '').toLowerCase();
            default: return 0;
          }
        };
        const va = getVal(a);
        const vb = getVal(b);
        if (typeof va === 'number') return (va - (vb as number)) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    return list;
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.pagination.isLoading.set(true);
    this.errorMessage.set(null);
    this.adminService.getAllOrders(this.pagination.currentPage(), this.pagination.pageSize(), this.statusFilter() || undefined).subscribe({
      next: (res) => {
        this.orders.set(res.orders);
        this.totalOrders.set(res.total);
        this.pagination.setResult(res.total, res.pages);
        this.totalGrossRevenue.set(res.totals?.grossRevenue || 0);
        this.totalPlatformFees.set(res.totals?.platformFees || 0);
        this.isLoading.set(false);
        this.pagination.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        this.errorMessage.set('Failed to fetch orders.');
        this.isLoading.set(false);
        this.pagination.isLoading.set(false);
      }
    });
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
    this.pagination.goToPage(1);
    this.loadOrders();
  }

  onSearchInput(): void {
    this.pagination.goToPage(1);
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortAsc.update(a => !a);
    } else {
      this.sortKey.set(key);
      this.sortAsc.set(true);
    }
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey() !== key) return '⇅';
    return this.sortAsc() ? '↑' : '↓';
  }

  nextPage(): void {
    this.pagination.nextPage();
    this.loadOrders();
  }

  prevPage(): void {
    this.pagination.prevPage();
    this.loadOrders();
  }

  goToPage(page: number): void {
    this.pagination.goToPage(page);
    this.loadOrders();
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      disputed: 'Disputed'
    };
    return labels[status] || status;
  }

  getPaymentLabel(method: string): string {
    const labels: Record<string, string> = {
      cash_on_delivery: 'Cash on Delivery',
      bank_transfer: 'Bank Transfer',
      online: 'Online',
      credit_card: 'Credit Card'
    };
    return labels[method] || method;
  }

  statusOptions = ADMIN_STATUS_OPTIONS;

  exportCsv(): void {
    const rows = this.filteredOrders();
    const headers = ['Product', 'Buyer', 'Seller', 'Price', 'Platform Fee', 'Status', 'Payment', 'Date'];
    const data = rows.map((o: any) => [
      o.productId?.title || 'Unknown',
      o.buyerId?.name || 'Deleted',
      o.sellerId?.name || 'Deleted',
      o.price?.toString() || '0',
      o.platformFee?.toString() || '0',
      o.status || '',
      o.paymentMethod || '',
      o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '',
    ]);
    exportToCsv('orders', [headers, ...data]);
  }

  toggleExpand(orderId: string): void {
    this.expandedOrderId.set(this.expandedOrderId() === orderId ? null : orderId);
  }

  openDisputeModal(orderId: string): void {
    this.disputeOrderId.set(orderId);
    this.disputeResolution.set('seller_fault');
    this.disputeNote.set('');
    this.showDisputeModal.set(true);
  }

  closeDisputeModal(): void {
    this.showDisputeModal.set(false);
    this.disputeOrderId.set(null);
    this.disputeNote.set('');
  }

  resolveDispute(): void {
    const id = this.disputeOrderId();
    if (!id) return;
    this.savingDispute.set(true);
    this.http.post(`${environment.apiUrl}/admin/orders/${id}/resolve-dispute`, {
      resolution: this.disputeResolution()
    }).subscribe({
      next: () => {
        this.toastService.success('Dispute resolved successfully.');
        this.savingDispute.set(false);
        this.closeDisputeModal();
        this.loadOrders();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to resolve dispute.');
        this.savingDispute.set(false);
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showDisputeModal.set(false);
  }

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
