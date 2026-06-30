import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { OrderService } from '../../../../core/services/order.service';
import { PaymentMethod } from '../../../../core/models/order.model';
import { Product, ProductSummary, CONDITION_LABELS, CATEGORY_LABELS } from '../../../../core/models/product.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';
import { OfferService } from '../../../../core/services/offer.service';
import { FlashSaleService } from '../../../../core/services/flash-sale.service';
import { ReportModal } from '../../../../shared/components/report-modal/report-modal';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { AuthRequiredModalComponent } from '../../../../shared/components/auth-required-modal/auth-required-modal';
import { CountdownTimerService } from '../../../../core/services/countdown-timer.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TimeAgoPipe, CurrencyFormatPipe, ImageFallbackDirective, ReportModal, ProductCardComponent, AuthRequiredModalComponent],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  wishlistService = inject(WishlistService);
  private offerService = inject(OfferService);
  private orderService = inject(OrderService);
  private flashSaleService = inject(FlashSaleService);
  private cdr = inject(ChangeDetectorRef);
  private timerService = inject(CountdownTimerService);

  product: Product | undefined;
  relatedProducts: ProductSummary[] = [];
  conditionLabels = CONDITION_LABELS;
  activeImage = 0;
  isOwner = false;
  showReportModal = false;
  showAuthModal = false;
  isLoading = true;
  categoryLabel = '';

  // Tab & Lightbox UI State
  activeTab: 'description' | 'specifications' | 'seller' | 'safety' = 'description';
  showLightbox = false;
  lightboxIndex = 0;
  showOfferModal = false;
  offerAmount = 0;
  offerSuccess = '';

  checkoutCountdown = signal<string>('');
  private checkoutTimerId: any = null;
  private _flashSub: any = null;

  negotiatedPrice = signal<number | null>(null);
  activeOfferId: string | null = null;
  private _pendingNegotiatedPrice: number | null = null;
  private _pendingAutoOpenBuy = false;

  // Buy Flow state variables
  get displayAttributes(): { label: string; value: string }[] {
    if (!this.product?.rawDynamicAttributes) return [];
    const skip = new Set(['conditionscore', 'score', 'brand', 'color', 'storage', 'condition', 'item_type']);
    const raw = this.product.rawDynamicAttributes;
    const result: { label: string; value: string }[] = [];
    for (const [key, val] of Object.entries(raw)) {
      if (skip.has(key.toLowerCase())) continue;
      if (val === undefined || val === null || val === '') continue;
      if (key.endsWith('_other')) continue;
      let displayValue = String(val);
      if (displayValue === 'Other' && raw[key + '_other']) {
        displayValue = String(raw[key + '_other']);
      }
      result.push({ label: key.charAt(0).toUpperCase() + key.slice(1), value: displayValue });
    }
    return result;
  }

  get exteriorScore(): number {
    return this.product?.conditionScore ? Math.min(100, this.product.conditionScore * 10 - 4) : 90;
  }

  get functionalityScore(): number {
    return this.product?.conditionScore ? Math.min(100, this.product.conditionScore * 10) : 95;
  }

  get cosmeticScore(): number {
    return this.product?.conditionScore ? Math.min(100, this.product.conditionScore * 10 - 2) : 92;
  }

  /**
   * Price the buyer actually pays.
   * Uses server-computed pricing from the discount engine when available,
   * falls back to product price or negotiated offer price.
   */
  get effectivePrice(): number {
    const negPrice = this.negotiatedPrice();
    if (negPrice !== null) {
      return negPrice;
    }
    if (this.product?.isOnSale && this.product?.salePrice) {
      return this.product.salePrice;
    }
    return this.product?.price ?? 0;
  }

  /** Discounted sale price — sourced from server-side engine */
  get salePrice(): number {
    if (this.product?.isOnSale && this.product?.salePrice) {
      return this.product.salePrice;
    }
    return this.product?.price ?? 0;
  }

  /** Original price (the "was" price shown crossed out) */
  get compareAtPrice(): number | undefined {
    if (!this.product?.isOnSale || !this.product?.price) return undefined;
    return this.product.originalPrice || this.product.price;
  }

  /** Whether a sale (flash or category) is currently active */
  get isOnSale(): boolean {
    return this.product?.isOnSale ?? false;
  }

  /** Savings percentage from the server */
  get savingsPercent(): number {
    return this.product?.savingsPercent ?? 0;
  }

  /** Savings value from the server */
  get savingsValue(): number {
    return this.product?.savingsValue ?? 0;
  }

  /** Whether this item is on a flash sale (not just a category sale) */
  get isFlashSaleItem(): boolean {
    return this.product?.isFlashSale ?? false;
  }

  showBuyModal = false;
  paymentMethod: PaymentMethod = 'cash_on_delivery';
  shippingCity = '';
  shippingArea = '';
  shippingStreet = '';
  shippingBuilding = '';
  orderNotes = '';
  buyLoading = false;
  buySuccess = signal<string | null>(null);
  buyError = signal<string | null>(null);

  // Credit Card fields
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  cardHolderName = '';

  // Coupon State
  couponCode = '';
  appliedCoupon = false;
  couponDiscount = 0;
  couponValidationMessage = '';
  isValidatingCoupon = false;

  openLightbox(index: number) {
    this.lightboxIndex = index;
    this.showLightbox = true;
  }

  closeLightbox() {
    this.showLightbox = false;
  }

  nextLightboxImage(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.product && this.product.images.length > 0) {
      this.lightboxIndex = (this.lightboxIndex + 1) % this.product.images.length;
    }
  }

  prevLightboxImage(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.product && this.product.images.length > 0) {
      this.lightboxIndex = (this.lightboxIndex - 1 + this.product.images.length) % this.product.images.length;
    }
  }

  setActiveTab(tab: 'description' | 'specifications' | 'seller' | 'safety') {
    this.activeTab = tab;
  }

  openOfferModal() {
    this.executeAuthorizedAction(() => {
      this.showOfferModal = true;
      this.offerAmount = this.product?.price ? Math.round(this.product.price * 0.9) : 0;
      this.offerSuccess = '';
    });
  }

  closeOfferModal() {
    this.showOfferModal = false;
  }

  submitOffer() {
    if (!this.product) return;
    this.offerService.makeOffer({ productId: this.product.id, amount: this.offerAmount }).subscribe({
      next: (res) => {
        this.offerSuccess = `Offer of $${this.offerAmount} submitted to seller!`;
        setTimeout(() => {
          this.closeOfferModal();
          this.router.navigate(['/chat'], {
            queryParams: {
              recipientId: this.product!.seller.id,
              productId: this.product!.id
            }
          });
        }, 1500);
      },
      error: (err) => {
        console.error('Failed to submit offer:', err);
      }
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';
      this.isLoading = true;
      this.product = undefined;
      this.negotiatedPrice.set(null);
      this._pendingNegotiatedPrice = null;
      this._pendingAutoOpenBuy = false;

      const startTime = Date.now();

      this.productService.getProductById(id).subscribe({
        next: (product) => {
          this.product = product;
          this.activeImage = 0;
          this.isLoading = false;
          const catName = product.categoryName || CATEGORY_LABELS[product.category] || product.category || '';
          if (catName.toLowerCase() === 'other' && product.rawDynamicAttributes?.['item_type']) {
            this.categoryLabel = product.rawDynamicAttributes['item_type'];
          } else {
            this.categoryLabel = catName;
          }

          const currentUser = this.authService.currentUser();
          this.isOwner = currentUser?.id === product.seller.id;

          if (currentUser) {
            this.offerService.getMyOffers().subscribe({
              next: (offers) => {
                const acceptedOffer = offers.find(o =>
                  o.productId === product.id &&
                  o.status === 'accepted' &&
                  !o.orderId &&
                  o.buyerId === currentUser.id
                );
                if (acceptedOffer) {
                   this.negotiatedPrice.set(acceptedOffer.counterAmount || acceptedOffer.amount);
                   this.activeOfferId = acceptedOffer.id;
                   if (acceptedOffer.expiresAt) {
                     this.startCheckoutCountdown(acceptedOffer.expiresAt);
                   }
                   this.cdr.detectChanges();
                 }
              }
            });
          }

          this._checkPendingOfferCheckout();

          this.productService.getProducts().subscribe(allProducts => {
            const matched = allProducts.filter(p => p.id !== id && p.category === product.category);
            this.relatedProducts = matched.sort(() => 0.5 - Math.random()).slice(0, 8);
            this.cdr.detectChanges();
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading product:', err);
          this.isLoading = false;
          this.cdr.detectChanges();
          this.router.navigate(['/products']);
        }
      });

      window.scrollTo(0, 0);
    });

    // Refresh product pricing when flash sales start or end
    this._flashSub = this.flashSaleService.salesChanged$.subscribe(() => {
      const pid = this.product?.id;
      if (pid && this.negotiatedPrice() === null) {
        this.productService.getProductById(pid).subscribe({
          next: (fresh) => {
            Object.assign(this.product!, fresh);
            this.cdr.markForCheck();
          },
        });
      }
    });

    this.route.queryParams.subscribe(params => {
      const buyNow = params['buyNow'];
      const offerId = params['offerId'];
      if (buyNow === 'true' && offerId) {
        this.offerService.getOffer(offerId).subscribe({
          next: (offer) => {
            const finalPrice = (offer.status === 'accepted' && !offer.orderId) ? (offer.counterAmount || offer.amount) : null;
            if (finalPrice !== null) {
              this._pendingNegotiatedPrice = finalPrice;
              this._pendingAutoOpenBuy = true;
              this.activeOfferId = offer.id;
              if (offer.expiresAt) {
                this.startCheckoutCountdown(offer.expiresAt);
              }
              this._checkPendingOfferCheckout();
            }
          },
          error: (err) => console.error('Error fetching offer for checkout:', err)
        });
      }
    });
  }

  private _checkPendingOfferCheckout() {
    if (this._pendingAutoOpenBuy && this.product && this._pendingNegotiatedPrice !== null) {
      this.negotiatedPrice.set(this._pendingNegotiatedPrice);
      this._pendingAutoOpenBuy = false;
      this._pendingNegotiatedPrice = null;
      this.openBuy();
    }
  }

  setActiveImage(index: number) {
    this.activeImage = index;
  }

  nextImage(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.product && this.product.images.length > 0) {
      this.activeImage = (this.activeImage + 1) % this.product.images.length;
    }
  }

  prevImage(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.product && this.product.images.length > 0) {
      this.activeImage = (this.activeImage - 1 + this.product.images.length) % this.product.images.length;
    }
  }

  executeAuthorizedAction(action: () => void): void {
    if (this.authService.currentUser()) {
      action();
    } else {
      this.showAuthModal = true;
    }
  }

  closeAuthModal(): void {
    this.showAuthModal = false;
  }

  startChat(): void {
    this.executeAuthorizedAction(() => {
      if (this.product) {
        this.router.navigate(['/chat'], {
          queryParams: {
            recipientId: this.product.seller.id,
            productId: this.product.id
          }
        });
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  toggleWishlist(): void {
    this.executeAuthorizedAction(() => {
      if (this.product) {
        const wasWishlisted = this.wishlistService.isWishlisted(this.product.id);
        this.wishlistService.toggle(this.product.id);
        this.product = {
          ...this.product,
          favoriteCount: this.product!.favoriteCount + (wasWishlisted ? -1 : 1),
        };
      }
    });
  }

  toggleWishlistCard(productId: string, event?: any): void {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
      event.preventDefault();
    }
    this.executeAuthorizedAction(() => {
      this.wishlistService.toggle(productId);
    });
  }

  openReport(): void {
    this.executeAuthorizedAction(() => {
      this.showReportModal = true;
    });
  }

  closeReport(): void {
    this.showReportModal = false;
  }

  openBuy(): void {
    this.executeAuthorizedAction(() => {
      // Refresh product data so stale flash sale prices don't carry over
      if (this.product) {
        this.productService.getProductById(this.product.id).subscribe({
          next: (fresh) => {
            this.product = fresh;
            this.cdr.detectChanges();
          },
        });
      }

      this.showBuyModal = true;
      this.paymentMethod = 'cash_on_delivery';
      this.shippingCity = '';
      this.shippingArea = '';
      this.shippingStreet = '';
      this.shippingBuilding = '';
      this.orderNotes = '';
      this.buyLoading = false;
      this.buySuccess.set(null);
      this.buyError.set(null);
      this.cardNumber = '';
      this.cardExpiry = '';
      this.cardCvv = '';
      this.cardHolderName = '';

      // Reset coupon state
      this.couponCode = '';
      this.appliedCoupon = false;
      this.couponDiscount = 0;
      this.couponValidationMessage = '';
      this.isValidatingCoupon = false;
    });
  }

  closeBuy(): void {
    this.showBuyModal = false;
    if (this.checkoutTimerId) {
      clearInterval(this.checkoutTimerId);
      this.checkoutTimerId = null;
    }
  }

  startCheckoutCountdown(expiresAtStr: string | Date) {
    if (this.checkoutTimerId) clearInterval(this.checkoutTimerId);

    const update = () => {
      const timeStr = this.timerService.formatTimeRemaining(expiresAtStr);
      this.checkoutCountdown.set(timeStr);
      if (timeStr === 'Expired') {
        clearInterval(this.checkoutTimerId);
        this.checkoutTimerId = null;
      }
    };

    update();
    this.checkoutTimerId = setInterval(update, 1000);
  }

  ngOnDestroy(): void {
    if (this.checkoutTimerId) {
      clearInterval(this.checkoutTimerId);
    }
    if (this._flashSub) {
      this._flashSub.unsubscribe();
    }
  }

  applyCoupon(): void {
    if (!this.couponCode.trim() || !this.product) return;
    this.isValidatingCoupon = true;
    this.couponValidationMessage = '';

    this.orderService.validateCoupon(this.couponCode.trim(), this.product.id).subscribe({
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

  formatCardNumber(): void {
    const cleaned = this.cardNumber.replace(/\D/g, '');
    const groups: string[] = [];
    for (let i = 0; i < cleaned.length && groups.length < 4; i += 4) {
      groups.push(cleaned.substring(i, i + 4));
    }
    this.cardNumber = groups.join(' ').trim();
  }

  formatCardExpiry(): void {
    let val = this.cardExpiry.replace(/\D/g, '');
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    this.cardExpiry = val;
  }

  removeCoupon(): void {
    this.couponCode = '';
    this.appliedCoupon = false;
    this.couponDiscount = 0;
    this.couponValidationMessage = '';
  }

  submitOrder(): void {
    if (!this.product) return;
    const addrParts = [this.shippingCity, this.shippingArea, this.shippingStreet, this.shippingBuilding].filter(Boolean);
    if (addrParts.length < 2) {
      this.buyError.set('Please provide at least your city and street address');
      return;
    }

    if (this.paymentMethod === 'credit_card') {
      const num = this.cardNumber.replace(/\s/g, '');
      if (!num || num.length < 13) {
        this.buyError.set('Please enter a valid card number');
        return;
      }
      if (!this.cardExpiry || !/^\d{2}\/\d{2}$/.test(this.cardExpiry)) {
        this.buyError.set('Please enter a valid expiry date (MM/YY)');
        return;
      }
      if (!this.cardCvv || this.cardCvv.length < 3) {
        this.buyError.set('Please enter a valid CVV');
        return;
      }
      if (!this.cardHolderName.trim()) {
        this.buyError.set('Please enter the cardholder name');
        return;
      }
    }

    this.buyLoading = true;
    this.buyError.set(null);
    this.buySuccess.set(null);

    const payload: any = {
      productId: this.product.id,
      paymentMethod: this.paymentMethod,
      shippingAddress: addrParts.join(', '),
      notes: this.orderNotes,
      price: this.effectivePrice,
      couponCode: this.appliedCoupon ? this.couponCode.trim().toUpperCase() : undefined,
      offerId: this.route.snapshot.queryParams['offerId'] || undefined
    };

    if (this.paymentMethod === 'credit_card') {
      payload.cardDetails = {
        cardNumber: this.cardNumber.replace(/\s/g, ''),
        cardExpiry: this.cardExpiry,
        cardCvv: this.cardCvv,
        cardHolderName: this.cardHolderName.trim()
      };
    }

    this.orderService.createOrder(payload).subscribe({
      next: (order) => {
        this.buyLoading = false;
        this.buySuccess.set('Order placed successfully! Product is now marked as Sold.');
        if (this.product) {
          this.product.status = 'sold';
        }
        this.offerService.activeReservation.set(null);
        setTimeout(() => {
          this.closeBuy();
        }, 2500);
      },
      error: (err) => {
        this.buyLoading = false;
        this.buyError.set(err?.error?.message || 'Failed to place order. Please try again.');
      }
    });
  }
}
