import { Component, OnInit, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field';
import { percentageRange, positiveNumber } from '../../../../shared/utils/validators';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FormFieldComponent, EmptyStateComponent, AdminErrorPanelComponent, AdminLoaderComponent],
  templateUrl: './coupons.html',
  styleUrl: './coupons.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Coupons implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private fb = inject(FormBuilder);

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

  // Reactive forms
  createForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(3)]],
    discountValue: [null as number | null, [Validators.required, positiveNumber()]],
    expiryDate: [''],
    maxUses: [null as number | null],
    maxPerUser: [null as number | null],
  });

  editForm = this.fb.group({
    discountType: ['percentage'],
    discountValue: [null as number | null, [Validators.required, positiveNumber()]],
    expiryDate: [''],
    maxUses: [null as number | null],
    maxPerUser: [null as number | null],
    minOrderValue: [null as number | null],
    isActive: [true],
  });

  // Edit Modal
  showEditModal = signal(false);
  isEditDropdownOpen = signal(false);
  editCouponData: any = null;
  editDiscountType = 'percentage';
  editDiscountValue: number | null = null;
  editExpiryDate = '';
  editMaxUses: number | null = null;
  editMaxPerUser: number | null = null;
  editMinOrderValue: number | null = null;
  editIsActive = true;

  ngOnInit(): void {
    this.loadCoupons();
  }

  openCreateModal(): void {
    this.createForm.reset();
    this.newCode = '';
    this.newDiscountValue = null;
    this.showCreateModal.set(true);
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
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    const fv = this.createForm.value;
    if (this.newDiscountType === 'percentage' && (fv.discountValue ?? 0) > 100) {
      this.toastService.error('Percentage discount cannot exceed 100%');
      return;
    }

    this.isSubmitting = true;
    const payload: any = {
      code: (fv.code ?? '').trim().toUpperCase(),
      discountType: this.newDiscountType,
      discountValue: fv.discountValue ?? 0,
      expiryDate: fv.expiryDate || null,
      maxUses: fv.maxUses,
      maxPerUser: fv.maxPerUser,
    };

    this.adminService.createCoupon(payload).subscribe({
      next: (newCoupon) => {
        this.toastService.success(`Coupon ${newCoupon.code} created successfully.`);
        this.couponsList.update(list => [newCoupon, ...list]);
        this.createForm.reset();
        this.newCode = '';
        this.newDiscountValue = null;
        this.isSubmitting = false;
        this.showCreateModal.set(false);
      },
      error: (err) => {
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
        this.toastService.error(err?.error?.message || 'Failed to toggle coupon status.');
      }
    });
  }

  editCoupon(coupon: any): void {
    this.editCouponData = coupon;
    this.editDiscountType = coupon.discountType || 'percentage';
    this.editDiscountValue = coupon.discountValue;
    this.editExpiryDate = coupon.expiryDate ? coupon.expiryDate.split('T')[0] : '';
    this.editMaxUses = coupon.maxUses;
    this.editMaxPerUser = coupon.maxPerUser;
    this.editMinOrderValue = coupon.minimumOrderValue;
    this.editIsActive = coupon.isActive;
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editCouponData = null;
  }

  toggleEditDropdown(): void {
    this.isEditDropdownOpen.update(v => !v);
  }

  selectEditDiscountType(type: string): void {
    this.editDiscountType = type;
    this.isEditDropdownOpen.set(false);
  }

  saveEditCoupon(): void {
    if (!this.editCouponData) return;
    if (this.editDiscountValue === null || this.editDiscountValue <= 0) {
      this.toastService.error('Discount value must be greater than 0');
      return;
    }
    if (this.editDiscountType === 'percentage' && this.editDiscountValue > 100) {
      this.toastService.error('Percentage discount cannot exceed 100%');
      return;
    }

    this.isSubmitting = true;
    const payload: any = {
      discountType: this.editDiscountType,
      discountValue: this.editDiscountValue,
      isActive: this.editIsActive,
    };
    if (this.editExpiryDate) payload.expiryDate = this.editExpiryDate;
    if (this.editMaxUses !== null) payload.maxUses = this.editMaxUses;
    if (this.editMaxPerUser !== null) payload.maxPerUser = this.editMaxPerUser;
    if (this.editMinOrderValue !== null) payload.minimumOrderValue = this.editMinOrderValue;

    this.adminService.patchCoupon(this.editCouponData.id, payload).subscribe({
      next: (updated) => {
        this.toastService.success(`Coupon ${this.editCouponData.code} updated.`);
        this.couponsList.update(list => list.map(c => c.id === this.editCouponData.id ? updated : c));
        this.isSubmitting = false;
        this.closeEditModal();
      },
      error: (err) => {
        console.error('Failed to update coupon:', err);
        this.toastService.error(err?.error?.message || 'Failed to update coupon.');
        this.isSubmitting = false;
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
