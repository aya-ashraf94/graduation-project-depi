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
import { ChangeDetectorRef } from '@angular/core';

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

  private cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  myListings: ProductSummary[] = [];
  wishlistItems: ProductSummary[] = [];
  reviews: Review[] = [];
  activeTab: 'products' | 'wishlist' | 'reviews' = 'products';

  // ngOnInit() {
  //   this.user = this.authService.currentUser();

  //   if (this.user) {
  //     // 1. جلب المنتجات (تأكدي أن هذه الدالة في الـ Service تعيد Observable)
  //     this.productService.getProductsBySeller(this.user.id).subscribe({
  //       next: (products) => {
  //         console.log('Fetched products:', products); // أضيفي هذا للـ console للتأكد من وصول البيانات
  //         this.myListings = products;
  //       },
  //       error: (err) => {
  //         console.error('Error:', err);
  //       }
  //     });

  //     this.loadWishlist();
  //     this.reviews = this.reviewService.getReviewsForUser(this.user.id);
  //   }


  //   this.route.queryParams.subscribe(params => {
  //     const tab = params['tab'];
  //     if (tab) this.activeTab = tab;
  //   });
  // }

  // ngOnInit() {
  //   this.user = this.authService.currentUser();

  //   // نتحقق من وجود المستخدم ووجود الـ ID الخاص به
  //   if (this.user?.id) {
  //     this.productService.getProductsBySeller(this.user.id).subscribe({
  //       next: (products) => {
  //         console.log('Fetched products:', products); 
  //         this.myListings = products;
  //       },
  //       error: (err) => {
  //         console.error('Error fetching products:', err);
  //       }
  //     });

  //     this.loadWishlist();
  //     this.reviews = this.reviewService.getReviewsForUser(this.user.id);
  //   }


  //   this.route.queryParams.subscribe(params => {
  //     const tab = params['tab'];
  //     if (tab === 'products' || tab === 'wishlist' || tab === 'reviews') {
  //       this.activeTab = tab;
  //     }

  //   });
  // }

  ngOnInit() {
    this.user = this.authService.currentUser();

    // 1. جلب البيانات الأساسية للمستخدم
    if (this.user?.id) {
      
      // جلب منتجات هذا المستخدم فقط
      this.productService.getProductsBySeller(this.user.id).subscribe({
        next: (products) => {
          console.log('Fetched products:', products);
          this.myListings = products;
          this.cdr.detectChanges(); // تحديث الواجهة فور وصول البيانات
        },
        error: (err) => {
          console.error('Error fetching products:', err);
        }
      });

      // جلب الـ wishlist والـ reviews
      this.loadWishlist();
      this.reviews = this.reviewService.getReviewsForUser(this.user.id);
    }

    // 2. معالجة الـ Tabs (قراءة من الـ URL)
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'products' || tab === 'wishlist' || tab === 'reviews') {
        this.activeTab = tab;
        
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
}
