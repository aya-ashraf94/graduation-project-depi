import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { ProductService } from '../../../../core/services/product.service';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { ReviewService } from '../../../../core/services/review.service';
import { UserService } from '../../../../core/services/user.service';
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
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('profileSliderTrack') profileSliderTrack!: ElementRef;

  user: User | null = null;
  isOwnProfile = true;
  myListings: ProductSummary[] = [];
  wishlistItems: ProductSummary[] = [];
  reviews: Review[] = [];
  activeTab: 'products' | 'wishlist' | 'reviews' = 'products';
  
  showAllListings = false;
  showAuthModal = false;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      const currentUser = this.authService.currentUser();
      
      if (id && id !== 'me' && id !== currentUser?.id) {
        this.isOwnProfile = false;
        // Load target user profile
        this.userService.getUserById(id).subscribe({
          next: (user) => {
            this.user = user;
            if (user && user.id) {
              this.loadUserListings(user.id);
              this.reviews = this.reviewService.getReviewsForUser(user.id);
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error loading user profile:', err);
          }
        });
      } else {
        this.isOwnProfile = true;
        // Load current logged-in user profile
        this.user = currentUser;
        if (this.user?.id) {
          this.loadUserListings(this.user.id);
          this.loadWishlist();
          this.reviews = this.reviewService.getReviewsForUser(this.user.id);
        }
      }
    });

    // Handle Tabs (reading from query params)
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'products' || tab === 'wishlist' || tab === 'reviews') {
        this.activeTab = tab;
      }
    });
  }

  loadUserListings(userId: string) {
    this.productService.getProductsBySeller(userId).subscribe({
      next: (products) => {
        console.log('Fetched products for user:', userId, products);
        this.myListings = products;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching products:', err);
      }
    });
  }

  // loadWishlist(): void {
  //   const ids = this.wishlistService.getWishlistIds();
  //   this.wishlistItems = ids
  //     .map(id => {
  //       const products = this.productService.getProducts();
  //       return products.find(p => p.id === id);
  //     })
  //     .filter((p): p is ProductSummary => !!p);
  // }

  loadWishlist(): void {
    const ids = this.wishlistService.getWishlistIds();

    // جلب كل المنتجات أولاً من السيرفر
    this.productService.getProducts().subscribe(allProducts => {
      this.wishlistItems = ids
        .map(id => allProducts.find(p => p.id === id))
        .filter((p): p is ProductSummary => !!p);
    });
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

  slideLeft() {
    if (this.profileSliderTrack) {
      this.profileSliderTrack.nativeElement.scrollBy({ left: -320, behavior: 'smooth' });
    }
  }

  slideRight() {
    if (this.profileSliderTrack) {
      this.profileSliderTrack.nativeElement.scrollBy({ left: 320, behavior: 'smooth' });
    }
  }

  toggleWishlist(productId: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.authService.currentUser()) {
      this.wishlistService.toggle(productId);
    } else {
      this.showAuthModal = true;
    }
  }

  closeAuthModal(): void {
    this.showAuthModal = false;
  }
}
