import { Component, OnInit, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { OrderService } from '../../../../core/services/order.service';
import { PaymentMethod } from '../../../../core/models/order.model';
import { Product, ProductSummary, CONDITION_LABELS } from '../../../../core/models/product.model';
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

  // Buy Flow state variables
  showBuyModal = false;
  paymentMethod: PaymentMethod = 'cash_on_delivery';
  shippingAddress = '';
  orderNotes = '';
  buyLoading = false;
  buySuccess = signal<string | null>(null);
  buyError = signal<string | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';
      this.isLoading = true;
      this.product = undefined;
      
      const startTime = Date.now();

      // 1. جلب المنتج بـ subscribe
      this.productService.getProductById(id).subscribe({
        next: (product) => {
          const elapsed = Date.now() - startTime;
          const delayTime = Math.max(0, 400 - elapsed);

          setTimeout(() => {
            this.product = product;
            this.activeImage = 0;
            this.isLoading = false;

            // 2. التحقق من الملكية داخل الـ next
            const currentUser = this.authService.currentUser();
            this.isOwner = currentUser?.id === product.seller.id;

            // 3. جلب المنتجات ذات الصلة بعد نجاح جلب المنتج (نفس القسم ومخلوطين عشوائياً)
            this.productService.getProducts().subscribe(allProducts => {
              const matched = allProducts.filter(p => p.id !== id && p.category === product.category);
              const shuffled = matched.sort(() => 0.5 - Math.random());
              this.relatedProducts = shuffled.slice(0, 3);
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

  toggleWishlist(): void {
    this.executeAuthorizedAction(() => {
      if (this.product) {
        this.wishlistService.toggle(this.product.id);
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
