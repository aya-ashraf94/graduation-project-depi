import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { Product, ProductSummary, CONDITION_LABELS } from '../../../../core/models/product.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TimeAgoPipe, CurrencyFormatPipe, ImageFallbackDirective],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  wishlistService = inject(WishlistService);

  product: Product | undefined;
  relatedProducts: ProductSummary[] = [];
  conditionLabels = CONDITION_LABELS;
  activeImage = 0;
  isOwner = false;
  showReportModal = false;
  showAuthModal = false;
  reportReason = '';
  reportSubmitted = false;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';
      
      // 1. جلب المنتج بـ subscribe
      this.productService.getProductById(id).subscribe({
        next: (product) => {
          this.product = product;
          this.activeImage = 0;
          
          // 2. التحقق من الملكية داخل الـ next
          const currentUser = this.authService.currentUser();
          this.isOwner = currentUser?.id === product.seller.id;

          // 3. جلب المنتجات ذات الصلة بعد نجاح جلب المنتج
          this.productService.getProducts().subscribe(allProducts => {
            this.relatedProducts = allProducts
              .filter(p => p.id !== id) // استخدام id مباشرة
              .slice(0, 3);
          });
        },
        error: (err) => {
          console.error('Error loading product:', err);
          this.router.navigate(['/products']);
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
      this.router.navigate(['/chat']);
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
    if (this.reportReason.trim()) {
      // REAL: this.http.post(`${environment.apiUrl}/reports`, { productId, reason })
      this.reportSubmitted = true;
      setTimeout(() => this.closeReport(), 2000);
    }
  }
}
