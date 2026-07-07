import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output, signal, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Product } from '../../../../core/models/product.model';
import { CreateOrderRequest } from '../../../../core/models/order.model';
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
export class CheckoutModalComponent implements OnInit {
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
  private http = inject(HttpClient);

  paymentMethod: 'cash_on_delivery' | 'online' = 'cash_on_delivery';
  shippingCity = '';
  shippingArea = '';
  shippingStreet = '';
  shippingBuilding = '';
  orderNotes = '';

  // Platform fee
  platformFeePercent = 5;
  platformFee = 0;

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

  ngOnInit(): void {
    this.loadPlatformFee();
  }

  private loadPlatformFee(): void {
    this.http.get<{ platformFeePercent: number }>(`${environment.apiUrl}/settings/platform-fee`).subscribe({
      next: (res) => {
        this.platformFeePercent = res.platformFeePercent;
        this.recalcPlatformFee();
      },
      error: () => {
        this.platformFeePercent = 5;
        this.recalcPlatformFee();
      }
    });
  }

  private recalcPlatformFee(): void {
    const base = this.effectivePrice() - (this.appliedCoupon ? this.couponDiscount : 0);
    this.platformFee = Math.round(base * this.platformFeePercent / 100 * 100) / 100;
    this.cdr.detectChanges();
  }

  get totalPrice(): number {
    const base = this.effectivePrice() - (this.appliedCoupon ? this.couponDiscount : 0);
    return base + this.platformFee;
  }

  closeModal() {
    this.close.emit();
  }

  applyCoupon(): void {
    const prod = this.product();
    if (!this.couponCode.trim() || !prod) return;
    this.isValidatingCoupon = true;
    this.couponValidationMessage = '';

    this.orderService.validateCoupon(this.couponCode.trim(), prod.id).subscribe({
      next: (res) => {
        this.isValidatingCoupon = false;
        if (res.valid) {
          this.appliedCoupon = true;
          this.couponDiscount = res.discountAmount;
          this.couponValidationMessage = `Coupon applied! Saved $${res.discountAmount}`;
          this.recalcPlatformFee();
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
    this.recalcPlatformFee();
  }

  submitOrder(): void {
    const prod = this.product();
    if (!prod) return;

    if (!this.shippingCity || !this.shippingStreet) {
      this.buyError.set('Please provide both City and Street in your shipping address');
      return;
    }

    const addrParts = [this.shippingCity, this.shippingArea, this.shippingStreet, this.shippingBuilding].filter(Boolean);

    if (this.paymentMethod === 'online') {
      this.handleOnlinePayment(prod, addrParts);
    } else {
      this.handleCashOnDelivery(prod, addrParts);
    }
  }

  private handleCashOnDelivery(prod: Product, addrParts: string[]): void {
    this.buyLoading = true;
    this.buyError.set(null);
    this.buySuccess.set(null);

    const payload: CreateOrderRequest = {
      productId: prod.id,
      paymentMethod: 'cash_on_delivery',
      shippingAddress: addrParts.join(', '),
      notes: this.orderNotes,
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

  private handleOnlinePayment(prod: Product, addrParts: string[]): void {
    this.buyLoading = true;
    this.buyError.set(null);
    this.buySuccess.set(null);

    const payload = {
      productId: prod.id,
      shippingAddress: addrParts.join(', '),
      notes: this.orderNotes,
      couponCode: this.appliedCoupon ? this.couponCode.trim().toUpperCase() : undefined,
      offerId: this.route.snapshot.queryParams['offerId'] || undefined
    };

    this.http.post<{ url: string }>(`${environment.apiUrl}/payments/create-checkout-session`, payload).subscribe({
      next: (res) => {
        // Redirect to Stripe Checkout
        window.location.href = res.url;
      },
      error: (err) => {
        this.buyLoading = false;
        this.buyError.set(err?.error?.message || 'Failed to initiate payment. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }
}
