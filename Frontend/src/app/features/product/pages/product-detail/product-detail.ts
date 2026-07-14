import { Component, OnInit, OnDestroy, AfterViewInit, inject, ChangeDetectorRef, signal, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { OrderService } from '../../../../core/services/order.service';
import { SettingsService } from '../../../../core/services/settings.service';
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

declare const Stripe: any;

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TimeAgoPipe, CurrencyFormatPipe, ImageFallbackDirective, ReportModal, ProductCardComponent, AuthRequiredModalComponent],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetail implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  wishlistService = inject(WishlistService);
  private offerService = inject(OfferService);
  private orderService = inject(OrderService);
  private settingsService = inject(SettingsService);
  private flashSaleService = inject(FlashSaleService);
  private cdr = inject(ChangeDetectorRef);
  private timerService = inject(CountdownTimerService);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);

  get mapUrl(): SafeResourceUrl | null {
    if (!this.product?.location) return null;
    const q = encodeURIComponent(this.product.location + ', Egypt');
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${q}&output=embed`
    );
  }

  product: Product | undefined;
  relatedProducts: ProductSummary[] = [];
  conditionLabels = CONDITION_LABELS;
  activeImage = 0;
  isOwner = false;
  isBuyer = false;
  orderId: string | null = null;
  showReportModal = false;
  showAuthModal = false;
  isLoading = true;
  categoryLabel = '';

  // Tab & Lightbox UI State
  activeTab: 'description' | 'specifications' | 'seller' | 'safety' = 'description';
  showLightbox = false;
  lightboxIndex = 0;
  isZoomed = false;
  zoomX = 50;
  zoomY = 50;
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

  @ViewChild('cardElementContainer') cardElementContainer?: ElementRef;

  private stripe: any = null;
  private cardElement: any = null;
  private elements: any = null;

  // Platform Fee State
  platformFeePercent = 0;
  estimatedPlatformFee = 0;

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

          if (currentUser && product.status === 'sold') {
            const stored = localStorage.getItem(`purchased_${product.id}`);
            if (stored) {
              this.isBuyer = true;
              this.orderId = stored;
            } else {
              this.orderService.getOrders(1, 50).subscribe({
                next: (orders) => {
                  const bought = orders.find(o => o.productId === product.id && o.buyerId === currentUser.id);
                  if (bought) {
                    this.isBuyer = true;
                    this.orderId = bought.id;
                    localStorage.setItem(`purchased_${product.id}`, bought.id);
                    this.cdr.detectChanges();
                  }
                }
              });
            }
          }

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
    this.isZoomed = false;
  }

  nextImage(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.product && this.product.images.length > 0) {
      this.activeImage = (this.activeImage + 1) % this.product.images.length;
    }
    this.isZoomed = false;
  }

  prevImage(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.product && this.product.images.length > 0) {
      this.activeImage = (this.activeImage - 1 + this.product.images.length) % this.product.images.length;
    }
    this.isZoomed = false;
  }

  onImageMouseEnter() {
    this.isZoomed = true;
  }

  onImageMouseMove(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    let x = ((event.clientX - rect.left) / rect.width) * 100;
    let y = ((event.clientY - rect.top) / rect.height) * 100;
    x = Math.min(100, Math.max(0, x));
    y = Math.min(100, Math.max(0, y));
    this.zoomX = x;
    this.zoomY = y;
    this.cdr.detectChanges();
  }

  onImageMouseLeave() {
    this.isZoomed = false;
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
    sessionStorage.setItem('restore_listings_state', 'true');
    this.router.navigate(['/products']);
  }

  goToExploreAll(): void {
    if (this.product?.category) {
      const catLabel = CATEGORY_LABELS[this.product.category] || this.product.category;
      this.router.navigate(['/products'], { queryParams: { category: catLabel } });
    } else {
      this.router.navigate(['/products']);
    }
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

  ngAfterViewInit(): void {
    if (typeof Stripe !== 'undefined') {
      this.stripe = Stripe(environment.stripePublishableKey);
    }
    if (this.paymentMethod === 'online') {
      setTimeout(() => this.mountCardElement());
    }
  }

  onPaymentMethodChange(method: 'cash_on_delivery' | 'online'): void {
    this.paymentMethod = method;
    if (method === 'online') {
      setTimeout(() => this.mountCardElement());
    } else {
      this.destroyCardElement();
    }
    this.loadPlatformFeePercent(method);
  }

  private loadPlatformFeePercent(method: 'cash_on_delivery' | 'online'): void {
    if (method === 'cash_on_delivery') {
      this.settingsService.getCodFee().subscribe({
        next: (res) => {
          this.platformFeePercent = res.codFeePercent;
          this.estimatedPlatformFee = Math.round(this.effectivePrice * this.platformFeePercent) / 100;
          this.cdr.detectChanges();
        },
        error: () => { this.platformFeePercent = 0; this.estimatedPlatformFee = 0; }
      });
    } else {
      this.settingsService.getPlatformFee().subscribe({
        next: (res) => {
          this.platformFeePercent = res.platformFeePercent;
          this.estimatedPlatformFee = Math.round(this.effectivePrice * this.platformFeePercent) / 100;
          this.cdr.detectChanges();
        },
        error: () => { this.platformFeePercent = 0; this.estimatedPlatformFee = 0; }
      });
    }
  }

  private mountCardElement(): void {
    if (!this.stripe || !this.cardElementContainer) return;
    this.destroyCardElement();
    this.elements = this.stripe.elements();
    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          color: '#000',
          '::placeholder': { color: '#999' }
        }
      }
    });
    this.cardElement.mount(this.cardElementContainer.nativeElement);
    this.cdr.detectChanges();
  }

  private destroyCardElement(): void {
    if (this.cardElement) {
      this.cardElement.destroy();
      this.cardElement = null;
      this.elements = null;
    }
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

      // Soft-reserve the product
      if (this.product && this.product.status === 'available') {
        this.product.status = 'reserved';
        this.cdr.detectChanges();
        this.productService.reserveProduct(this.product.id).subscribe({
          error: (err) => {
            if (this.product) {
              this.product.status = 'available';
              this.cdr.detectChanges();
            }
            if (err.status === 409) {
              this.buyError.set(err.error?.message || 'This product is no longer available');
            }
          }
        });
      }

      this.destroyCardElement();
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

      // Reset coupon state
      this.couponCode = '';
      this.appliedCoupon = false;
      this.couponDiscount = 0;
      this.couponValidationMessage = '';
      this.isValidatingCoupon = false;

      // Fetch platform fee percentage
      this.loadPlatformFeePercent('cash_on_delivery');
    });
  }

  closeBuy(): void {
    // Release the soft-reservation only if it wasn't sold
    if (this.product && this.product.status !== 'sold') {
      this.product.status = 'available';
      this.cdr.detectChanges();
      this.productService.releaseProduct(this.product.id).subscribe();
    }

    this.destroyCardElement();
    this.showBuyModal = false;
    if (this.checkoutTimerId) {
      clearInterval(this.checkoutTimerId);
      this.checkoutTimerId = null;
    }
    this.cdr.detectChanges();
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
    if (this.product && this.product.status === 'available') {
      this.productService.releaseProduct(this.product.id).subscribe();
    }
    this.destroyCardElement();
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

    if (this.paymentMethod === 'online') {
      this.handleOnlinePayment(addrParts);
    } else {
      this.handleCashOnDelivery(addrParts);
    }
  }

  private handleCashOnDelivery(addrParts: string[]): void {
    this.buyLoading = true;
    this.buyError.set(null);
    this.buySuccess.set(null);

    const payload: any = {
      productId: this.product!.id,
      paymentMethod: 'cash_on_delivery',
      shippingAddress: addrParts.join(', '),
      notes: this.orderNotes,
      couponCode: this.appliedCoupon ? this.couponCode.trim().toUpperCase() : undefined,
      offerId: this.activeOfferId || undefined
    };

    this.orderService.createOrder(payload).subscribe({
      next: (order) => {
        this.buyLoading = false;
        this.buySuccess.set('Order placed successfully! Product is now marked as Sold.');
        if (this.product) {
          this.product.status = 'sold';
          this.isBuyer = true;
          this.orderId = order.id;
          localStorage.setItem(`purchased_${this.product.id}`, order.id);
        }
        this.offerService.activeReservation.set(null);
        this.cdr.detectChanges();
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

  private async handleOnlinePayment(addrParts: string[]): Promise<void> {
    this.buyLoading = true;
    this.buyError.set(null);
    this.buySuccess.set(null);

    if (!this.stripe || !this.cardElement) {
      this.buyLoading = false;
      this.buyError.set('Payment system not initialized. Please try again.');
      return;
    }

    const productId = this.product!.id;

    const payload = {
      productId,
      shippingAddress: addrParts.join(', '),
      notes: this.orderNotes,
      couponCode: this.appliedCoupon ? this.couponCode.trim().toUpperCase() : undefined,
      offerId: this.activeOfferId || undefined
    };

    try {
      const intentRes = await firstValueFrom(
        this.http.post<{ clientSecret: string }>(`${environment.apiUrl}/payments/create-payment-intent`, payload)
      );

      const { error, paymentIntent } = await this.stripe.confirmCardPayment(intentRes.clientSecret, {
        payment_method: { card: this.cardElement }
      });

      if (error) {
        this.buyLoading = false;
        this.buyError.set(error.message || 'Payment failed. Please try again.');
        return;
      }

      if (paymentIntent.status !== 'succeeded') {
        this.buyLoading = false;
        this.buyError.set(`Payment ${paymentIntent.status}. Please try again.`);
        return;
      }

      // Payment succeeded — create the order immediately
      try {
        const confirmRes = await firstValueFrom(
          this.http.post<any>(`${environment.apiUrl}/payments/confirm-payment`, {
            paymentIntentId: paymentIntent.id
          })
        );
        this.buyLoading = false;
        this.buySuccess.set('Payment successful! Order placed.');
        if (this.product) {
          this.product.status = 'sold';
          this.isBuyer = true;
          this.orderId = confirmRes?.order?.id || null;
          if (this.orderId) {
            localStorage.setItem(`purchased_${this.product.id}`, this.orderId);
          }
        }
        this.offerService.activeReservation.set(null);
        this.cdr.detectChanges();
        setTimeout(() => this.closeBuy(), 2500);
      } catch (err: any) {
        this.buyLoading = false;
        this.buyError.set(err?.error?.message || 'Order creation failed. Please contact support.');
      }
    } catch (err: any) {
      this.buyLoading = false;
      this.buyError.set(err?.message || 'Failed to process payment.');
    }
  }
}
