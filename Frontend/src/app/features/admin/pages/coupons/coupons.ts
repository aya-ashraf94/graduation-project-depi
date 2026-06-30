import { Component, OnInit, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, AdminErrorPanelComponent, AdminLoaderComponent],
  templateUrl: './coupons.html',
  styleUrl: './coupons.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Coupons implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  couponsList = signal<any[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  today = new Date();

  totalCount = computed(() => this.couponsList().length);
  activeCount = computed(() => this.couponsList().filter(c => c.isActive && !this.isExpired(c.expiryDate)).length);
  expiredCount = computed(() => this.couponsList().filter(c => this.isExpired(c.expiryDate)).length);

  searchQuery = signal('');
  statusFilter = signal<'all' | 'active' | 'expired'>('all');
  showGuide = signal(false);

  filteredCouponsList = computed(() => {
    const list = this.couponsList();
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();

    return list.filter(coupon => {
      const matchesQuery = coupon.code.toLowerCase().includes(query);
      const isExp = this.isExpired(coupon.expiryDate);
      const isActiveAndNotExpired = coupon.isActive && !isExp;

      if (filter === 'active') {
        return matchesQuery && isActiveAndNotExpired;
      } else if (filter === 'expired') {
        return matchesQuery && isExp;
      }
      return matchesQuery;
    });
  });

  // Form Model
  newCode = '';
  newDiscountType = 'percentage';
  newDiscountValue: number | null = null;
  newExpiryDate = '';
  newMaxUses: number | null = null;
  newMaxPerUser: number | null = null;
  isSubmitting = false;
  showCreateModal = signal(false);
  isDropdownOpen = signal(false);

  ngOnInit(): void {
    this.loadCoupons();
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update(v => !v);
  }

  selectDiscountType(type: string): void {
    this.newDiscountType = type;
    this.isDropdownOpen.set(false);
  }

  isExpired(expiryDate: any): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < this.today;
  }

  loadCoupons(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.adminService.getCoupons().subscribe({
      next: (data) => {
        this.couponsList.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load coupons:', err);
        this.errorMessage.set('Failed to load coupon codes.');
        this.isLoading.set(false);
      }
    });
  }

  createCoupon(): void {
    if (!this.newCode.trim()) {
      this.toastService.error('Coupon code is required');
      return;
    }
    if (this.newDiscountValue === null || this.newDiscountValue <= 0) {
      this.toastService.error('Discount value must be greater than 0');
      return;
    }
    if (this.newDiscountType === 'percentage' && this.newDiscountValue > 100) {
      this.toastService.error('Percentage discount cannot exceed 100%');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      code: this.newCode.trim().toUpperCase(),
      discountType: this.newDiscountType,
      discountValue: this.newDiscountValue,
      expiryDate: this.newExpiryDate ? this.newExpiryDate : null,
      maxUses: this.newMaxUses,
      maxPerUser: this.newMaxPerUser
    };

    this.adminService.createCoupon(payload).subscribe({
      next: (newCoupon) => {
        this.toastService.success(`Coupon ${newCoupon.code} created successfully.`);
        this.couponsList.update(list => [newCoupon, ...list]);
        // Reset form
        this.newCode = '';
        this.newDiscountValue = null;
        this.newExpiryDate = '';
        this.newMaxUses = null;
        this.newMaxPerUser = null;
        this.isSubmitting = false;
        this.showCreateModal.set(false);
      },
      error: (err) => {
        console.error('Failed to create coupon:', err);
        this.toastService.error(err?.error?.message || 'Failed to create coupon.');
        this.isSubmitting = false;
      }
    });
  }

  toggleCoupon(coupon: any): void {
    const nextVal = !coupon.isActive;
    this.adminService.patchCoupon(coupon.id, { isActive: nextVal }).subscribe({
      next: (updated) => {
        this.toastService.success(`Coupon ${coupon.code} status updated.`);
        this.couponsList.update(list => list.map(c => c.id === coupon.id ? updated : c));
      },
      error: (err) => {
        console.error('Failed to toggle coupon:', err);
        this.toastService.error('Failed to toggle coupon status.');
      }
    });
  }

  deleteCoupon(coupon: any): void {
    this.confirmService.show({
      title: 'Delete Coupon',
      message: `Are you sure you want to delete coupon "${coupon.code}"?`,
      onConfirm: () => {
        this.adminService.deleteCoupon(coupon.id).subscribe({
          next: () => {
            this.toastService.success(`Coupon ${coupon.code} deleted successfully.`);
            this.couponsList.update(list => list.filter(c => c.id !== coupon.id));
          },
          error: (err) => {
            console.error('Failed to delete coupon:', err);
            this.toastService.error('Failed to delete coupon.');
          }
        });
      }
    });
  }
}
