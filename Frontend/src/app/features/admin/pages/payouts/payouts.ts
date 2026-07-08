import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService, PayoutRequest } from '../../../../core/services/wallet.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';

@Component({
  selector: 'app-admin-payouts',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe, AdminLoaderComponent, AdminErrorPanelComponent],
  templateUrl: './payouts.html',
  styleUrl: './payouts.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPayouts implements OnInit {
  private walletService = inject(WalletService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  payouts = signal<PayoutRequest[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  filterStatus = signal<string>('all');

  // Auto-payout settings
  autoPayoutDays = signal(3);
  autoPayoutEnabled = signal(true);
  showAutoPayoutModal = signal(false);
  savingAutoPayout = signal(false);

  ngOnInit(): void {
    this.loadPayouts();
    this.loadAutoPayoutSettings();
  }

  loadPayouts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.walletService.adminGetPayouts().subscribe({
      next: (list) => {
        this.payouts.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching payouts:', err);
        this.errorMessage.set('Failed to load payout requests.');
        this.isLoading.set(false);
      }
    });
  }

  loadAutoPayoutSettings(): void {
    this.walletService.getAutoPayoutSettings().subscribe({
      next: (res) => {
        this.autoPayoutDays.set(res.autoPayoutDays);
        this.autoPayoutEnabled.set(res.enabled);
      },
      error: () => {}
    });
  }

  get filteredPayouts(): PayoutRequest[] {
    const status = this.filterStatus();
    if (status === 'all') return this.payouts();
    return this.payouts().filter(p => p.status === status);
  }

  processPayout(id: string, status: 'approved' | 'rejected'): void {
    this.confirmService.show({
      title: 'Process Payout',
      message: `Are you sure you want to mark this payout request as ${status}?`,
      onConfirm: () => {
        this.walletService.adminUpdatePayout(id, status).subscribe({
          next: () => {
            this.toastService.success(`Payout request successfully ${status}!`);
            this.payouts.update(list =>
              list.map(p => p.id === id ? { ...p, status } : p)
            );
          },
          error: (err) => {
            console.error(`Error processing payout:`, err);
            this.toastService.error(err?.error?.message || `Failed to update payout request`);
          }
        });
      }
    });
  }

  openAutoPayoutModal(): void {
    this.showAutoPayoutModal.set(true);
  }

  saveAutoPayoutSettings(): void {
    this.savingAutoPayout.set(true);
    this.walletService.updateAutoPayoutSettings(this.autoPayoutDays()).subscribe({
      next: () => {
        this.toastService.success(`Auto-payout set to ${this.autoPayoutDays()} day(s) after delivery`);
        this.savingAutoPayout.set(false);
        this.showAutoPayoutModal.set(false);
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to update settings');
        this.savingAutoPayout.set(false);
      }
    });
  }

  processAutoPayoutsNow(): void {
    this.confirmService.show({
      title: 'Process Auto-Payouts',
      message: 'Manually trigger auto-approval for all eligible pending payouts?',
      onConfirm: () => {
        this.walletService.processAutoPayouts().subscribe({
          next: (res) => {
            this.toastService.success(res.message || 'Auto-payouts processed');
            this.loadPayouts();
          },
          error: (err) => this.toastService.error(err?.error?.message || 'Failed to process')
        });
      }
    });
  }
}