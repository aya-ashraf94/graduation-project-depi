import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupons.html',
  styleUrl: './coupons.css'
})
export class Coupons implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  couponsList = signal<any[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  today = new Date();

  // Form Model
  newCode = '';
  newDiscountType = 'percentage';
  newDiscountValue: number | null = null;
  newExpiryDate = '';
  isSubmitting = false;

  ngOnInit(): void {
    this.loadCoupons();
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
      expiryDate: this.newExpiryDate ? this.newExpiryDate : null
    };

    this.adminService.createCoupon(payload).subscribe({
      next: (newCoupon) => {
        this.toastService.success(`Coupon ${newCoupon.code} created successfully.`);
        this.couponsList.update(list => [newCoupon, ...list]);
        // Reset form
        this.newCode = '';
        this.newDiscountValue = null;
        this.newExpiryDate = '';
        this.isSubmitting = false;
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
