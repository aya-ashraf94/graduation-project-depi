import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { ProductService } from '../../../../core/services/product.service';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { ReviewService } from '../../../../core/services/review.service';
import { User } from '../../../../core/models/user.model';
import { ProductSummary } from '../../../../core/models/product.model';
import { Review } from '../../../../core/models/review.model';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyFormatPipe, TimeAgoPipe, ImageFallbackDirective],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css',
})
export class MyProfile implements OnInit {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  wishlistService = inject(WishlistService);
  private reviewService = inject(ReviewService);

  private route = inject(ActivatedRoute);

  user: User | null = null;
  myListings: ProductSummary[] = [];
  wishlistItems: ProductSummary[] = [];
  reviews: Review[] = [];
  activeTab: 'products' | 'wishlist' | 'reviews' = 'products';

  ngOnInit() {
    this.user = this.authService.currentUser();
    if (this.user) {
      this.myListings = this.productService.getProductsBySeller(this.user.id);
      this.loadWishlist();
      this.reviews = this.reviewService.getReviewsForUser(this.user.id);
    }

    // Read tab query param (e.g. ?tab=wishlist)
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'wishlist' || tab === 'reviews' || tab === 'products') {
        this.activeTab = tab;
        if (tab === 'wishlist') this.loadWishlist();
      }
    });
  }

  loadWishlist(): void {
    const ids = this.wishlistService.getWishlistIds();
    this.wishlistItems = ids
      .map(id => {
        const products = this.productService.getProducts();
        return products.find(p => p.id === id);
      })
      .filter((p): p is ProductSummary => !!p);
  }

  removeFromWishlist(productId: string): void {
    this.wishlistService.remove(productId);
    this.loadWishlist();
  }

  getStars(rating: number): string {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }

  logout() {
    this.authService.logout();
  }
}
