import { Component, OnInit, inject, ChangeDetectorRef, signal } from '@angular/core';
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

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TimeAgoPipe, CurrencyFormatPipe, ImageFallbackDirective],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private orderService = inject(OrderService);
  wishlistService = inject(WishlistService);
  private cdr = inject(ChangeDetectorRef);

  product: Product | undefined;
  relatedProducts: ProductSummary[] = [];
  conditionLabels = CONDITION_LABELS;
  activeImage = 0;
  isOwner = false;
  showReportModal = false;
  showAuthModal = false;
  reportReason = '';
  reportSubmitted = false;
  isLoading = true;
  categoryLabel = '';

  // Tab & Lightbox UI State
  activeTab: 'description' | 'specifications' | 'seller' | 'safety' = 'description';
  showLightbox = false;
  lightboxIndex = 0;
  showOfferModal = false;
  offerAmount = 0;
  offerSuccess = '';

  // Buy Flow state variables
  get displayAttributes(): { label: string; value: string }[] {
    if (!this.product?.rawDynamicAttributes) return [];
    const skip = new Set(['conditionscore', 'score']);
    const result: { label: string; value: string }[] = [];
    for (const [key, val] of Object.entries(this.product.rawDynamicAttributes)) {
      if (skip.has(key.toLowerCase())) continue;
      if (val === undefined || val === null || val === '') continue;
      result.push({ label: key.charAt(0).toUpperCase() + key.slice(1), value: String(val) });
    }
    return result;
  }

  showBuyModal = false;
  paymentMethod: PaymentMethod = 'cash_on_delivery';
  shippingAddress = '';
  orderNotes = '';
  buyLoading = false;
  buySuccess = signal<string | null>(null);
  buyError = signal<string | null>(null);

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
    this.offerSuccess = `Offer of $${this.offerAmount} submitted to seller!`;
    setTimeout(() => {
      this.closeOfferModal();
    }, 2000);
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';
      this.isLoading = true;
      this.product = undefined;
      
      const startTime = Date.now();

      this.productService.getProductById(id).subscribe({
        next: (product) => {
          const elapsed = Date.now() - startTime;
          const delayTime = Math.max(0, 400 - elapsed);

          setTimeout(() => {
            this.product = product;
            this.activeImage = 0;
            this.isLoading = false;
            this.categoryLabel = product.categoryName || CATEGORY_LABELS[product.category] || product.category;

            const currentUser = this.authService.currentUser();
            this.isOwner = currentUser?.id === product.seller.id;

            this.productService.getProducts().subscribe(allProducts => {
              const matched = allProducts.filter(p => p.id !== id && p.category === product.category);
              this.relatedProducts = matched.sort(() => 0.5 - Math.random()).slice(0, 8);
              this.cdr.detectChanges();
            });
            this.cdr.detectChanges();
          }, delayTime);
        },
        error: (err) => {
          console.error('Error loading product:', err);
          const elapsed = Date.now() - startTime;
          const delayTime = Math.max(0, 400 - elapsed);

          setTimeout(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
            this.router.navigate(['/products']);
          }, delayTime);
        }
      });
      
      window.scrollTo(0, 0);
    });
  }

  setActiveImage(index: number) {
    this.activeImage = index;
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

  openReport(): void {
    this.executeAuthorizedAction(() => {
      this.showReportModal = true;
      this.reportReason = '';
      this.reportSubmitted = false;
    });
  }

  closeReport(): void {
    this.showReportModal = false;
  }

  submitReport(): void {
    if (this.reportReason.trim() && this.product) {
      this.productService.reportProduct(this.product.id, this.reportReason).subscribe({
        next: () => {
          this.reportSubmitted = true;
          setTimeout(() => this.closeReport(), 2000);
        },
        error: (err) => {
          console.error('Error submitting report:', err);
        }
      });
    }
  }

  openBuy(): void {
    this.executeAuthorizedAction(() => {
      this.showBuyModal = true;
      this.paymentMethod = 'cash_on_delivery';
      this.shippingAddress = '';
      this.orderNotes = '';
      this.buyLoading = false;
      this.buySuccess.set(null);
      this.buyError.set(null);
    });
  }

  closeBuy(): void {
    this.showBuyModal = false;
  }

  submitOrder(): void {
    if (!this.shippingAddress.trim() || !this.product) {
      this.buyError.set('Please provide a shipping address');
      return;
    }
    
    this.buyLoading = true;
    this.buyError.set(null);
    this.buySuccess.set(null);
    
    const payload = {
      productId: this.product.id,
      paymentMethod: this.paymentMethod,
      shippingAddress: this.shippingAddress,
      notes: this.orderNotes
    };
    
    this.orderService.createOrder(payload).subscribe({
      next: (order) => {
        this.buyLoading = false;
        this.buySuccess.set('Order placed successfully! Product is now marked as Sold.');
        if (this.product) {
          this.product.status = 'sold';
        }
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
