import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, signal } from '@angular/core';
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
import { SettingsService } from '../../../../core/services/settings.service';
import { OfferService } from '../../../../core/services/offer.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TimeAgoPipe, CurrencyFormatPipe, ImageFallbackDirective],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  wishlistService = inject(WishlistService);
  private orderService = inject(OrderService);
  private offerService = inject(OfferService);
  private cdr = inject(ChangeDetectorRef);
  private settingsService = inject(SettingsService);

  discountPercent = 7;

  product: Product | undefined;
  relatedProducts: ProductSummary[] = [];
  conditionLabels = CONDITION_LABELS;
  activeImage = 0;
  isOwner = false;
  showReportModal = false;
  showAuthModal = false;
  reportReason = '';
  reportDetails = '';
  reportSubmitted = false;
  submittingReport = false;
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

  get effectivePrice(): number {
    const negPrice = this.negotiatedPrice();
    if (negPrice !== null) {
      return negPrice;
    }
    return this.product?.price ? Math.round(this.product.price * (1 - this.discountPercent / 100)) : 0;
  }

  get priceSavingsPercent(): number {
    return this.discountPercent;
  }

  get priceSavingsValue(): number {
    return this.product?.price ? Math.round(this.product.price * (this.discountPercent / 100)) : 0;
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
    this.settingsService.getDiscount().subscribe({
      next: (res) => {
        this.discountPercent = res.discount;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load discount setting:', err);
      }
    });

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

    this.route.queryParams.subscribe(params => {
      const buyNow = params['buyNow'];
      const offerId = params['offerId'];
      if (buyNow === 'true' && offerId) {
        this.offerService.getOffer(offerId).subscribe({
          next: (offer) => {
            const finalPrice = offer.status === 'accepted' ? (offer.counterAmount || offer.amount) : null;
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

  getStars(rating: number): string {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
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

  toggleWishlistCard(productId: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.executeAuthorizedAction(() => {
      this.wishlistService.toggle(productId);
    });
  }

  reportError = '';

  openReport(): void {
    this.executeAuthorizedAction(() => {
      this.showReportModal = true;
      this.reportReason = '';
      this.reportDetails = '';
      this.reportSubmitted = false;
      this.submittingReport = false;
      this.reportError = '';
    });
  }

  closeReport(force: boolean = false): void {
    if (!force && (this.submittingReport || this.reportSubmitted)) return;
    this.showReportModal = false;
  }

  submitReport(): void {
    if (this.submittingReport) return;
    if (this.reportReason.trim() && this.product) {
      this.submittingReport = true;
      this.reportError = '';
      this.productService.reportProduct(this.product.id, this.reportReason, this.reportDetails || undefined).subscribe({
        next: () => {
          this.reportSubmitted = true;
          this.submittingReport = false;
          setTimeout(() => this.closeReport(true), 2500);
        },
        error: (err) => {
          this.submittingReport = false;
          if (err.status === 409) {
            this.reportError = err.error?.message || 'You have already reported this listing.';
          } else if (err.status === 400) {
            this.reportError = err.error?.message || 'Invalid submission. Please check your input.';
          } else {
            this.reportError = 'Something went wrong. Please try again later.';
          }
          this.cdr.detectChanges();
        }
      });
    }
  }

  openBuy(): void {
    this.executeAuthorizedAction(() => {
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
    const expiresAt = new Date(expiresAtStr).getTime();
    
    const update = () => {
      const now = Date.now();
      const diff = expiresAt - now;
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        this.checkoutCountdown.set(`${hh}:${mm}:${ss}`);
      } else {
        this.checkoutCountdown.set('Expired');
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
  }

  applyCoupon(): void {
    if (!this.couponCode.trim() || !this.product) return;
    this.isValidatingCoupon = true;
    this.couponValidationMessage = '';
    
    this.orderService.validateCoupon(this.couponCode.trim(), this.product.id, this.effectivePrice).subscribe({
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
    
    this.buyLoading = true;
    this.buyError.set(null);
    this.buySuccess.set(null);
    
    const payload = {
      productId: this.product.id,
      paymentMethod: this.paymentMethod,
      shippingAddress: addrParts.join(', '),
      notes: this.orderNotes,
      price: this.effectivePrice,
      couponCode: this.appliedCoupon ? this.couponCode.trim().toUpperCase() : undefined,
      offerId: this.route.snapshot.queryParams['offerId'] || undefined
    };
    
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
