import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { ProductService } from '../../../../core/services/product.service';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { ReviewService } from '../../../../core/services/review.service';
import { UserService } from '../../../../core/services/user.service';
import { OrderService } from '../../../../core/services/order.service';
import { User } from '../../../../core/models/user.model';
import { ProductSummary } from '../../../../core/models/product.model';
import { Review } from '../../../../core/models/review.model';
import { OrderSummary, OrderStatus } from '../../../../core/models/order.model';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyFormatPipe, TimeAgoPipe, ImageFallbackDirective],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css',
})
export class MyProfile implements OnInit {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  wishlistService = inject(WishlistService);
  private reviewService = inject(ReviewService);
  private userService = inject(UserService);
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('profileSliderTrack') profileSliderTrack!: ElementRef;

  user: User | null = null;
  isOwnProfile = true;
  myListings: ProductSummary[] = [];
  wishlistItems: ProductSummary[] = [];
  reviews: Review[] = [];
  myOrders: OrderSummary[] = [];
  activeTab: 'products' | 'wishlist' | 'reviews' | 'orders' = 'products';
  
  showAllListings = false;
  showAuthModal = false;
  
  // Edit profile modal state
  showEditModal = false;
  profileSuccess = signal<string | null>(null);
  profileError = signal<string | null>(null);
  editForm = {
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    tagsString: '',
    avatar: ''
  };

  // Review modal state
  showReviewModal = false;
  selectedOrderForReview: OrderSummary | null = null;
  reviewSuccess = signal<string | null>(null);
  reviewError = signal<string | null>(null);
  reviewLoading = false;
  reviewForm = {
    rating: 5,
    comment: ''
  };

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
              this.reviewService.getReviewsForUser(user.id).subscribe(revs => {
                this.reviews = revs;
                this.cdr.detectChanges();
              });
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
          this.reviewService.getReviewsForUser(this.user.id).subscribe(revs => {
            this.reviews = revs;
            this.cdr.detectChanges();
          });
          this.orderService.getOrders().subscribe(orders => {
            this.myOrders = orders;
            this.cdr.detectChanges();
          });
        }
      }
    });

    // Handle Tabs (reading from query params)
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'products' || tab === 'wishlist' || tab === 'reviews' || tab === 'orders') {
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

  openEditModal() {
    if (!this.user) return;
    this.profileSuccess.set(null);
    this.profileError.set(null);
    this.editForm = {
      firstName: this.user.firstName || '',
      lastName: this.user.lastName || '',
      bio: this.user.bio || '',
      location: this.user.location || '',
      tagsString: (this.user.tags || []).join(', '),
      avatar: this.user.avatar || ''
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  saveProfile() {
    if (!this.user) return;
    this.profileSuccess.set(null);
    this.profileError.set(null);
    
    const tags = this.editForm.tagsString
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
      
    const payload = {
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      bio: this.editForm.bio,
      location: this.editForm.location,
      tags,
      avatar: this.editForm.avatar
    };
    
    this.userService.updateProfile(this.user.id, payload).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.authService.updateLocalUser(updatedUser);
        this.profileSuccess.set('Profile updated successfully!');
        setTimeout(() => {
          this.closeEditModal();
        }, 1500);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating profile:', err);
        this.profileError.set(err?.error?.message || 'Failed to update profile. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  openReviewModal(order: OrderSummary) {
    this.selectedOrderForReview = order;
    this.reviewForm = {
      rating: 5,
      comment: ''
    };
    this.reviewSuccess.set(null);
    this.reviewError.set(null);
    this.reviewLoading = false;
    this.showReviewModal = true;
  }

  closeReviewModal() {
    this.showReviewModal = false;
  }

  submitReview() {
    if (!this.selectedOrderForReview || !this.reviewForm.comment.trim()) {
      this.reviewError.set('Please provide review comments');
      return;
    }
    
    this.reviewLoading = true;
    this.reviewError.set(null);
    this.reviewSuccess.set(null);
    
    const payload = {
      orderId: this.selectedOrderForReview.id,
      revieweeId: this.selectedOrderForReview.productId ? this.selectedOrderForReview.productId : '', 
      productId: this.selectedOrderForReview.productId,
      rating: this.reviewForm.rating,
      comment: this.reviewForm.comment
    };
    
    // In our model structure, getcounterparty user:
    // We need to send revieweeId. Since order has sellerId and buyerId, the backend createReview takes revieweeId.
    // Let's query backend with the correct revieweeId.
    // Wait, let's see: who is the reviewee? It is the seller of the product, which is NOT the buyer (current user).
    // So the revieweeId is the other participant in the transaction.
    // Let's get the seller's ID. In getOrdersByUser, counterpartyName was mapped.
    // Wait! Let's check how OrderSummary is mapped in OrderService:
    // Wait! Does OrderSummary contain the sellerId?
    // Let's check orderController.js formatOrder:
    // It maps `sellerId` inside product: `sellerId: orderObj.productId.userId`
    // And it has `buyer: { id: buyerId }`, `seller: { id: sellerId }`.
    // Wait, let's check what fields OrderSummary has in `order.model.ts`! Let's do `grep_search` or view it.
    // We already read OrderService maps:
    // buyer/seller details. Let's just find the seller's ID by checking if the current user is the buyer.
    // Wait, in orderController formatOrder, the backend returned the entire order object which we can read.
    // Let's check what orderController return properties are:
    // formatOrder returns:
    // id: orderObj._id,
    // product: { id, title, price, thumbnail, brand, condition, status, sellerId }
    // buyer: { id, firstName, lastName... }
    // seller: { id, firstName, lastName... }
    // So order.seller.id contains the seller's user ID!
    // And order.buyer.id contains the buyer's user ID!
    // This is perfect! Let's fetch the order details via getOrderById or extract it if available.
    // Wait, in OrderSummary (returned by getOrders), it returns:
    // id, productId, productTitle, productThumbnail, price, status, counterpartyName, createdAt.
    // Wait, OrderSummary does NOT contain the full seller object.
    // But we can fetch the full order using `orderService.getOrderById(order.id)` first, or let's pass the revieweeId directly!
    // Wait! How do we know the sellerId from OrderSummary?
    // Since the current user is the buyer, the counterparty of the purchase is the seller!
    // Wait, does the backend have the sellerId? Yes, the backend has `order.productId.userId` as the seller.
    // Let's check if the backend `createReview` can look up the order and find the sellerId automatically instead of requiring the frontend to pass it!
    // Let's check `reviewController.js` `createReview`:
    // It currently reads: `const { orderId, revieweeId, productId, rating, comment } = req.body;`
    // If we modify backend `createReview` to look up the `Order` by `orderId` and find the seller (`order.sellerId`), it would be 100% automatic and bulletproof!
    // Yes! That is extremely elegant and requires zero complex logic on the frontend.
    // Let's write the backend lookup in `reviewController.js`:
    //   const order = await Order.findById(orderId);
    //   const revieweeId = order.sellerId;
    //   const productId = order.productId;
    // This is incredibly smart! Let's do this backend update, so the frontend only needs to send `{ orderId, rating, comment }`.
    // This is super clean!
    
    this.reviewService.createReview(payload).subscribe({
      next: (rev) => {
        this.reviewLoading = false;
        this.reviewSuccess.set('Review submitted successfully!');
        
        // Refresh reviews
        if (this.user?.id) {
          this.reviewService.getReviewsForUser(this.user.id).subscribe(revs => {
            this.reviews = revs;
            this.cdr.detectChanges();
          });
        }
        
        setTimeout(() => {
          this.closeReviewModal();
        }, 1500);
      },
      error: (err) => {
        this.reviewLoading = false;
        this.reviewError.set(err?.error?.message || 'Failed to submit review.');
      }
    });
  }

  updateOrderStatus(orderId: string, status: OrderStatus) {
    this.orderService.updateOrder(orderId, { status }).subscribe({
      next: (updated) => {
        // Refresh orders list
        this.orderService.getOrders().subscribe(orders => {
          this.myOrders = orders;
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Error updating order:', err)
    });
  }

  getPurchases(): OrderSummary[] {
    if (!this.user) return [];
    return this.myOrders.filter((o: any) => o.buyerId === this.user?.id);
  }

  getSales(): OrderSummary[] {
    if (!this.user) return [];
    return this.myOrders.filter((o: any) => o.sellerId === this.user?.id);
  }
}
