import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RefundService, RefundRequest } from '../../../../core/services/refund.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-admin-refunds',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminErrorPanelComponent, AdminLoaderComponent, CurrencyFormatPipe],
  templateUrl: './refunds.html',
  styleUrl: './refunds.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRefunds implements OnInit {
  private refundService = inject(RefundService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  refunds = signal<RefundRequest[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  filterStatus = signal<string>('all');

  modalState = signal<{ show: boolean; refund: RefundRequest | null; action: 'approved' | 'rejected' | null; resolution: string }>({
    show: false, refund: null, action: null, resolution: ''
  });

  ngOnInit(): void {
    this.loadRefunds();
  }

  loadRefunds(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.refundService.adminGetRefundRequests().subscribe({
      next: (list) => {
        this.refunds.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load refund requests.');
        this.isLoading.set(false);
      }
    });
  }

  get filteredRefunds(): RefundRequest[] {
    const status = this.filterStatus();
    if (status === 'all') return this.refunds();
    return this.refunds().filter(r => r.status === status);
  }

  openProcessModal(refund: RefundRequest, action: 'approved' | 'rejected'): void {
    this.modalState.set({ show: true, refund, action, resolution: '' });
  }

  closeModal(): void {
    this.modalState.set({ show: false, refund: null, action: null, resolution: '' });
  }

  processRefund(): void {
    const state = this.modalState();
    if (!state.refund || !state.action) return;

    this.refundService.adminProcessRefund(state.refund.id, state.action, state.resolution || undefined).subscribe({
      next: () => {
        this.toastService.success(`Refund ${state.action} successfully!`);
        this.closeModal();
        this.loadRefunds();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to process refund');
      }
    });
  }

  getStatusLabel(status: string): string {
    return { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[status] || status;
  }
}