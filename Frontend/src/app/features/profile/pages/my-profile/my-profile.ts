import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
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
export class MyProfile implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  wishlistService = inject(WishlistService);
  private reviewService = inject(ReviewService);
  private userService = inject(UserService);
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  @ViewChild('profileSliderTrack') profileSliderTrack!: ElementRef;
  @ViewChild('tabsSection') tabsSection!: ElementRef;

  private shouldScrollToTabs = false;
  private isLocalTabClick = false;

  user: User | null = null;
  isOwnProfile = true;
  isLoadingProfile = true;
  myListings: ProductSummary[] = [];
  wishlistItems: ProductSummary[] = [];
  reviews: Review[] = [];
  myOrders: OrderSummary[] = [];
  reviewedOrderIds: Set<string> = new Set();
  dismissedOrderIds: Set<string> = new Set();
  expandedOrderIds: Set<string> = new Set();
  activeTab: 'products' | 'wishlist' | 'reviews' | 'orders' = 'products';
  orderView: 'purchases' | 'sales' = 'purchases';
  orderStatusFilter: string = 'all';


  showAllListings = false;
  showAuthModal = false;

  // Edit profile modal state
  showEditModal = false;
  editActiveTab: 'profile' | 'account' | 'security' | 'seller' = 'profile';
  profileSuccess = signal<string | null>(null);
  profileError = signal<string | null>(null);
  editForm = {
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    tagsString: '',
    avatar: '',
    email: ''
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

  showDeleteModal = false;
  productIdToDelete: string | null = null;

  isAdmin = computed(() => this.authService.isAdmin());

  goToAdminPanel() {
    this.router.navigate(['/admin']);
  }

  editProduct(productId: string) {
    this.router.navigate(['/listings/edit', productId]);
  }

  confirmDeleteProduct(productId: string) {
    this.productIdToDelete = productId;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.productIdToDelete = null;
  }

  deleteSelectedProduct() {
    if (!this.productIdToDelete) return;
    const id = this.productIdToDelete;
    this.closeDeleteModal();

    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.profileSuccess.set('Product listing deleted successfully!');
        setTimeout(() => this.profileSuccess.set(null), 3000);
        if (this.user?.id) {
          this.loadUserListings(this.user.id);
        }
      },
      error: (err) => {
        console.error('Error deleting product:', err);
        this.profileError.set(err?.error?.message || 'Failed to delete product. Please try again.');
        setTimeout(() => this.profileError.set(null), 3000);
      }
    });
  }

  ngOnInit() {
    this.loadDismissedOrders();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      const currentUser = this.authService.currentUser();
      this.isLoadingProfile = true;

      if (id && id !== 'me' && id !== currentUser?.id) {
        this.isOwnProfile = false;
        // Load target user profile
        this.userService.getUserById(id).subscribe({
          next: (user) => {
            this.user = user;
            this.isLoadingProfile = false;
            if (user && user.id) {
              const currentId = this.authService.currentUser()?.id;
              if (user.id === currentId) {
                this.isOwnProfile = true;
              } else {
                this.isOwnProfile = false;
              }
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
            this.isLoadingProfile = false;
            this.cdr.detectChanges();
          }
        });
      } else {
        this.isOwnProfile = true;
        if (currentUser && currentUser.id) {
          // Initialize user profile synchronously from local storage while fetching fresh details
          this.user = currentUser;
          this.isLoadingProfile = false;

          // Load fresh user profile details (sales/purchases/successRate) from backend
          this.userService.getUserById(currentUser.id).subscribe({
            next: (freshUser) => {
              this.user = freshUser;
              this.authService.updateLocalUser(freshUser);
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error fetching fresh user profile:', err);
              // Fallback to local storage if API fails
              this.user = currentUser;
              this.cdr.detectChanges();
            }
          });

          this.loadUserListings(currentUser.id);
          this.loadWishlist();
          this.reviewService.getReviewsForUser(currentUser.id).subscribe(revs => {
            this.reviews = revs;
            this.cdr.detectChanges();
          });
          this.orderService.getOrders().subscribe(orders => {
            this.myOrders = orders;
            this.cdr.detectChanges();
          });
          this.reviewService.getReviewsByUser(currentUser.id).subscribe(written => {
            this.reviewedOrderIds = new Set(written.map((r: any) => r.orderId?._id || r.orderId || r.id));
            this.cdr.detectChanges();
          });
        } else {
          this.isLoadingProfile = false;
        }
      }
    });

    // Handle Tabs (reading from query params)
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'products' || tab === 'wishlist' || tab === 'reviews' || tab === 'orders') {
        this.activeTab = tab;
        if (!this.isLocalTabClick) {
          this.shouldScrollToTabs = true;
          this.scrollToTabsSection();
        }
      }
      this.isLocalTabClick = false; // Reset local click flag
      const view = params['view'];
      if (view === 'purchases' || view === 'sales') {
        this.orderView = view;
      }
      this.cdr.detectChanges();
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
    this.wishlistService.getWishlistProducts().subscribe({
      next: (products) => {
        this.wishlistItems = products;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading wishlist products:', err);
      }
    });
  }

  removeFromWishlist(productId: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.wishlistService.remove(productId);
    this.wishlistItems = this.wishlistItems.filter(item => item.id !== productId);
    this.cdr.detectChanges();
  }

  getStars(rating: number): string {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }

  getRatingPercentage(stars: number): number {
    if (this.reviews.length === 0) return 0;
    const count = this.reviews.filter(r => Math.round(r.rating) === stars).length;
    return Math.round((count / this.reviews.length) * 100);
  }

  getRatingCount(stars: number): number {
    return this.reviews.filter(r => Math.round(r.rating) === stars).length;
  }

  getReviewerName(review: any): string {
    return review.reviewerId?.name || review.reviewerName || 'Campus Member';
  }

  getReviewerAvatar(review: any): string {
    return review.reviewerId?.avatar || review.reviewerAvatar || '';
  }

  getReviewProductName(review: any): string {
    return review.productId?.title || review.productTitle || '';
  }

  getConditionLabel(condition: string): string {
    switch (condition) {
      case 'new_with_tags': return 'Like New';
      case 'excellent': return 'Fresh';
      case 'good': return 'Good';
      case 'fair': case 'distressed': return 'Used';
      default: return 'Used';
    }
  }

  getConditionClass(condition: string): string {
    switch (condition) {
      case 'new_with_tags': return 'cond-like-new';
      case 'excellent': return 'cond-fresh';
      case 'good': return 'cond-good';
      case 'fair': case 'distressed': return 'cond-used';
      default: return 'cond-used';
    }
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
    this.editActiveTab = 'profile';
    this.editForm = {
      firstName: this.user.firstName || '',
      lastName: this.user.lastName || '',
      bio: this.user.bio || '',
      location: this.user.location || '',
      tagsString: (this.user.tags || []).join(', '),
      avatar: this.user.avatar || '',
      email: this.user.email || ''
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  shareProfile() {
    navigator.clipboard.writeText(window.location.href);
    this.profileSuccess.set('Profile link copied to clipboard!');
    setTimeout(() => {
      this.profileSuccess.set(null);
    }, 3000);
  }

  isFollowing = false;
  toggleFollowSeller() {
    this.isFollowing = !this.isFollowing;
    this.profileSuccess.set(this.isFollowing ? 'You are now following this seller!' : 'You have unfollowed this seller.');
    setTimeout(() => {
      this.profileSuccess.set(null);
    }, 3000);
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
      avatar: this.editForm.avatar,
      email: this.editForm.email
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
      rating: this.reviewForm.rating,
      comment: this.reviewForm.comment
    };

    this.reviewService.createReview(payload).subscribe({
      next: (rev) => {
        this.reviewLoading = false;
        this.reviewSuccess.set('Review submitted successfully!');

        // Mark order as reviewed in the local set so the button disappears immediately
        if (this.selectedOrderForReview) {
          this.reviewedOrderIds.add(this.selectedOrderForReview.id);
        }

        // Refresh reviews displayed on profile
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

        // Refresh listings and wishlist so the product status updates instantly
        if (this.user?.id) {
          this.loadUserListings(this.user.id);
        }
        this.loadWishlist();
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

  selectTab(tab: 'products' | 'wishlist' | 'reviews' | 'orders'): void {
    this.activeTab = tab;
    this.isLocalTabClick = true;
    const currentScroll = window.scrollY;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    }).then(() => {
      setTimeout(() => {
        window.scrollTo(0, currentScroll);
      }, 0);
    });
  }

  loadDismissedOrders(): void {
    const raw = localStorage.getItem('arch_dismissed_orders');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.dismissedOrderIds = new Set(parsed);
        }
      } catch (e) {
        console.error('Error loading dismissed orders:', e);
      }
    }
  }

  dismissOrder(orderId: string): void {
    this.dismissedOrderIds.add(orderId);
    localStorage.setItem('arch_dismissed_orders', JSON.stringify(Array.from(this.dismissedOrderIds)));
  }

  toggleOrderDetails(orderId: string): void {
    if (this.expandedOrderIds.has(orderId)) {
      this.expandedOrderIds.delete(orderId);
    } else {
      this.expandedOrderIds.add(orderId);
    }
  }

  isOrderExpanded(orderId: string): boolean {
    return this.expandedOrderIds.has(orderId);
  }

  getFilteredPurchases(): OrderSummary[] {
    return this.getPurchases()
      .filter(o => !this.dismissedOrderIds.has(o.id))
      .filter(o => this.orderStatusFilter === 'all' || o.status === this.orderStatusFilter);
  }

  getFilteredSales(): OrderSummary[] {
    return this.getSales()
      .filter(o => !this.dismissedOrderIds.has(o.id))
      .filter(o => this.orderStatusFilter === 'all' || o.status === this.orderStatusFilter);
  }

  ngAfterViewInit(): void {
    this.scrollToTabsSection();
  }

  scrollToTabsSection(): void {
    if (this.shouldScrollToTabs && this.tabsSection) {
      setTimeout(() => {
        this.tabsSection.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.shouldScrollToTabs = false;
      }, 200);
    }
  }
}
