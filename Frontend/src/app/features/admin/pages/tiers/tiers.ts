import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TierService, SellerTier } from '../../../../core/services/tier.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-admin-tiers',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminErrorPanelComponent, AdminLoaderComponent, CurrencyFormatPipe],
  templateUrl: './tiers.html',
  styleUrl: './tiers.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminTiers implements OnInit {
  private tierService = inject(TierService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  tiers = signal<SellerTier[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  showCreateModal = signal(false);
  editingTier = signal<SellerTier | null>(null);

  form = signal<Partial<SellerTier>>({
    name: '', description: '', feePercent: undefined, monthlyPrice: 0, yearlyPrice: 0, featuredListingsIncluded: 0, badgeLabel: '', isActive: true
  });

  ngOnInit(): void {
    this.loadTiers();
  }

  loadTiers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.tierService.getTiers().subscribe({
      next: (list) => { this.tiers.set(list); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load tiers.'); this.isLoading.set(false); }
    });
  }

  openCreateModal(): void {
    this.editingTier.set(null);
    this.form.set({ name: '', description: '', feePercent: undefined, monthlyPrice: 0, yearlyPrice: 0, featuredListingsIncluded: 0, badgeLabel: '', isActive: true });
    this.showCreateModal.set(true);
  }

  openEditModal(tier: SellerTier): void {
    this.editingTier.set(tier);
    this.form.set({ ...tier });
    this.showCreateModal.set(true);
  }

  closeModal(): void {
    this.showCreateModal.set(false);
    this.editingTier.set(null);
  }

  saveTier(): void {
    const data = this.form();
    const edit = this.editingTier();

    const obs = edit
      ? this.tierService.adminUpdateTier(edit.id, data)
      : this.tierService.adminCreateTier(data);

    obs.subscribe({
      next: () => {
        this.toastService.success(edit ? 'Tier updated!' : 'Tier created!');
        this.closeModal();
        this.loadTiers();
      },
      error: (err) => this.toastService.error(err?.error?.message || 'Failed to save tier')
    });
  }

  deleteTier(id: string): void {
    this.confirmService.show({
      title: 'Delete Tier',
      message: 'Are you sure? Users on this tier will be moved to Free.',
      onConfirm: () => {
        this.tierService.adminDeleteTier(id).subscribe({
          next: () => { this.toastService.success('Tier deleted.'); this.loadTiers(); },
          error: (err) => this.toastService.error(err?.error?.message || 'Failed to delete tier')
        });
      }
    });
  }
}