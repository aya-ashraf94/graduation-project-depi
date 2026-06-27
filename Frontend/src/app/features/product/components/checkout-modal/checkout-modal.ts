import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../../../core/models/product.model';
import { OrderService } from '../../../../core/services/order.service';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe],
  templateUrl: './checkout-modal.html',
  styleUrl: './checkout-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class CheckoutModalComponent {
  isOpen = input<boolean>(false);
  product = input<Product | null>(null);
  effectivePrice = input<number>(0);
  negotiatedPrice = input<number | null>(null);
  checkoutCountdown = input<string>('');

  close = output<void>();
  orderPlaced = output<void>();

  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  paymentMethod: 'cash_on_delivery' | 'online' = 'cash_on_delivery';
  shippingCity = '';
  shippingArea = '';
  shippingStreet = '';
  shippingBuilding = '';
  orderNotes = '';

  // Coupon state
  couponCode = '';
  appliedCoupon = false;
  couponDiscount = 0;
  couponValidationMessage = '';
  isValidatingCoupon = false;

  // Buy State
  buyLoading = false;
  buySuccess = signal<string | null>(null);
  buyError = signal<string | null>(null);

  closeModal() {
    this.close.emit();
  }

  applyCoupon(): void {
    const prod = this.product();
    if (!this.couponCode.trim() || !prod) return;
    this.isValidatingCoupon = true;
    this.couponValidationMessage = '';
    
    this.orderService.validateCoupon(this.couponCode.trim(), prod.id, this.effectivePrice()).subscribe({
      next: (res) => {
        this.isValidatingCoupon = false;
        if (res.valid) {
          this.appliedCoupon = true;
          this.couponDiscount = res.discountAmount;
          this.couponValidationMessage = `Coupon applied! Saved $${res.discountAmount}`;
        } else {
          this.couponValidationMessage = 'Invalid coupon code';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isValidatingCoupon = false;
        this.couponValidationMessage = err?.error?.message || 'Invalid coupon code';
        this.cdr.detectChanges();
      }
    });
  }

  removeCoupon(): void {
    this.couponCode = '';
    this.appliedCoupon = false;
    this.couponDiscount = 0;
    this.couponValidationMessage = '';
  }

  submitOrder(): void {
    const prod = this.product();
    if (!prod) return;
    
    if (!this.shippingCity || !this.shippingStreet) {
      this.buyError.set('Please provide both City and Street in your shipping address');
      return;
    }

    const addrParts = [this.shippingCity, this.shippingArea, this.shippingStreet, this.shippingBuilding].filter(Boolean);
    
    this.buyLoading = true;
    this.buyError.set(null);
    this.buySuccess.set(null);
    
    const payload = {
      productId: prod.id,
      paymentMethod: this.paymentMethod,
      shippingAddress: addrParts.join(', '),
      notes: this.orderNotes,
      price: this.effectivePrice() - (this.appliedCoupon ? this.couponDiscount : 0),
      couponCode: this.appliedCoupon ? this.couponCode.trim().toUpperCase() : undefined,
      offerId: this.route.snapshot.queryParams['offerId'] || undefined
    };
    
    this.orderService.createOrder(payload).subscribe({
      next: (order) => {
        this.buyLoading = false;
        this.buySuccess.set('Order placed successfully! Product is now marked as Sold.');
        this.orderPlaced.emit();
        setTimeout(() => {
          this.closeModal();
          this.buySuccess.set(null);
        }, 2000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.buyLoading = false;
        this.buyError.set(err?.error?.message || 'Failed to place order. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }
}
