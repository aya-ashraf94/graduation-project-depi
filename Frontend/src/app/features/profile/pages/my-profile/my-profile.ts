import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef, ViewChild, ElementRef, signal, computed, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { ChatService } from '../../../../core/services/chat.service';
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
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';
import { UserAvatarComponent } from '../../../../shared/components/user-avatar/user-avatar';
import { RatingDisplayComponent } from '../../../../shared/components/rating-display/rating-display';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { getConditionLabel, getConditionClass } from '../../../../shared/utils/condition.utils';
import { formatReviews, getReviewerName, getReviewerId } from '../../../../shared/utils/review.utils';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyFormatPipe, ImageFallbackDirective, UserAvatarComponent, RatingDisplayComponent, TimeAgoPipe, EditProfileModalComponent],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyProfile implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private productService = inject(ProductService);
  wishlistService = inject(WishlistService);
  private reviewService = inject(ReviewService);
  private userService = inject(UserService);
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private location = inject(Location);
  private toastService = inject(ToastService);

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
  activeTab: 'products' | 'drafts' | 'wishlist' | 'reviews' | 'orders' | 'blocked' = 'products';
  blockedUsers: any[] = [];
  isViewerBlocked = false;
  isPartnerBlockedByMe = false;
  orderView: 'purchases' | 'sales' = 'purchases';
  orderStatusFilter: string = 'all';

  // Products Pagination state
  currentPage = 1;
  pageSize = 8;

  get filteredListingsByTab(): ProductSummary[] {
    if (this.isViewerBlocked) return [];
    if (this.activeTab === 'drafts') {
      return this.myListings.filter(item => item.status === 'draft');
    }
    // 'products' tab: only show active/sold/etc. (exclude drafts)
    return this.myListings.filter(item => item.status !== 'draft');
  }

  get totalPages(): number {
    return Math.ceil(this.filteredListingsByTab.length / this.pageSize);
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get paginatedListings(): ProductSummary[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredListingsByTab.slice(start, start + this.pageSize);
  }

  // Mobile Products Swipe Slider state
  showAllListingsMobile = false;

  get isMobileDevice(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }

  get displayedListings(): ProductSummary[] {
    if (this.isMobileDevice && !this.showAllListingsMobile) {
      // Mobile default preview: first 6 items in slider
      return this.filteredListingsByTab.slice(0, 6);
    }
    // Desktop or expanded view: paginated list
    return this.paginatedListings;
  }
  showAuthModal = false;

  // Edit profile modal state
  showEditModal = false;
  profileSuccess = signal<string | null>(null);
  profileError = signal<string | null>(null);

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

  @HostListener('window:resize')
  onResize(): void {
    this.cdr.detectChanges();
  }

  goToAdminPanel() {
    this.router.navigate(['/admin']);
  }

  editProduct(productId: string) {
    this.router.navigate(['/listings/edit', productId]);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
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
      this.isViewerBlocked = false;
      this.isPartnerBlockedByMe = false;
      this.myListings = [];
      this.reviews = [];
      this.isLoadingProfile = true;

      if (id && id !== 'me' && id !== currentUser?.id) {
        this.isOwnProfile = false;
        // Load target user profile
        this.userService.getUserById(id).subscribe({
          next: (user) => {
            this.user = user;
            this.isLoadingProfile = false;
            this.isViewerBlocked = false;
            if (user && user.id) {
              const currentId = this.authService.currentUser()?.id;
              if (user.id === currentId) {
                this.isOwnProfile = true;
                this.loadUserListings(user.id);
                this.reviewService.getReviewsForUser(user.id).subscribe(revs => {
                  this.reviews = this.formatReviews(revs);
                  this.cdr.detectChanges();
                });
              } else {
                this.isOwnProfile = false;
                this.chatService.checkBlockStatus(user.id).subscribe({
                  next: (status) => {
                    this.isViewerBlocked = status.isBlockedByPartner;
                    this.isPartnerBlockedByMe = status.isBlocked;
                    if (!this.isViewerBlocked) {
                      this.loadUserListings(user.id);
                      this.reviewService.getReviewsForUser(user.id).subscribe(revs => {
                        this.reviews = this.formatReviews(revs);
                        this.cdr.detectChanges();
                      });
                    }
                    this.cdr.detectChanges();
                  },
                  error: (err) => {
                    console.error('Error checking block status:', err);
                    this.loadUserListings(user.id);
                  }
                });
              }
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
            this.reviews = this.formatReviews(revs);
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
      if (tab === 'products' || tab === 'drafts' || tab === 'wishlist' || tab === 'reviews' || tab === 'orders' || tab === 'blocked') {
        this.activeTab = tab;
        if (tab === 'blocked') {
          this.loadBlockedUsers();
        }
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
      // Auto-open edit modal when ?edit=true (from welcome notification)
      if (params['edit'] === 'true' && this.user && this.isOwnProfile) {
        this.openEditModal();
        const url = this.router.createUrlTree([], {
          relativeTo: this.route,
          queryParams: { edit: undefined },
          queryParamsHandling: 'merge'
        }).toString();
        this.location.go(url);
      }
      this.cdr.detectChanges();
    });
  }

  loadUserListings(userId: string) {
    this.productService.getProductsBySeller(userId).subscribe({
      next: (products) => {
        this.myListings = products;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching products:', err);
      }
    });
  }

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

  private formatReviews = formatReviews;

  removeFromWishlist(productId: string, event?: any): void {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
      event.preventDefault();
    }
    this.wishlistService.remove(productId);
    this.wishlistItems = this.wishlistItems.filter(item => item.id !== productId);
    this.cdr.detectChanges();
  }

  getConditionLabel = getConditionLabel;
  getConditionClass = getConditionClass;

  getRatingPercentage(stars: number): number {
    if (this.reviews.length === 0) return 0;
    const count = this.reviews.filter(r => Math.round(r.rating) === stars).length;
    return Math.round((count / this.reviews.length) * 100);
  }

  getRatingCount(stars: number): number {
    return this.reviews.filter(r => Math.round(r.rating) === stars).length;
  }

  getReviewerName = getReviewerName;
  getReviewerId = getReviewerId;

  getReviewProductName(review: any): string {
    return review.productId?.title || review.productTitle || '';
  }

  logout() {
    this.authService.logout();
  }


  toggleWishlist(productId: string, event?: any): void {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
      event.preventDefault();
    }
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
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  closeEditModal() {
    this.showEditModal = false;
    this.cdr.detectChanges();
  }

  async shareProfile() {
    const url = window.location.href;
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }
      await navigator.clipboard.writeText(url);
      this.profileSuccess.set('Profile link copied to clipboard!');
    } catch {
      try {
        this.fallbackCopy(url);
        this.profileSuccess.set('Profile link copied to clipboard!');
      } catch {
        this.profileError.set('Failed to copy link. Please copy the URL manually.');
      }
    }
    setTimeout(() => {
      this.profileSuccess.set(null);
      this.profileError.set(null);
    }, 3000);
  }

  private fallbackCopy(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  isFollowing = false;
  toggleFollowSeller() {
    this.isFollowing = !this.isFollowing;
    this.profileSuccess.set(this.isFollowing ? 'You are now following this seller!' : 'You have unfollowed this seller.');
    setTimeout(() => {
      this.profileSuccess.set(null);
    }, 3000);
  }

  onProfileSaved(updatedUser: User) {
    this.user = updatedUser;
    this.profileSuccess.set('Profile updated successfully!');
    setTimeout(() => {
      this.profileSuccess.set(null);
    }, 3000);
    this.cdr.detectChanges();
  }

  getPaymentLabel(method: string | undefined): string {
    const labels: Record<string, string> = {
      cash_on_delivery: 'Cash on Delivery',
      bank_transfer: 'Bank Transfer',
      online: 'Online Payment',
      credit_card: 'Credit Card'
    };
    return labels[method || ''] || method || '';
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
            this.reviews = this.formatReviews(revs);
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

  updatingOrders: { [orderId: string]: OrderStatus } = {};

  updateOrderStatus(orderId: string, status: OrderStatus) {
    if (this.updatingOrders[orderId]) return;
    this.updatingOrders[orderId] = status;
    this.cdr.detectChanges();

    this.orderService.updateOrder(orderId, { status }).subscribe({
      next: (updated) => {
        // Refresh orders list
        this.orderService.getOrders().subscribe({
          next: (orders) => {
            this.myOrders = orders;
            delete this.updatingOrders[orderId];
            this.cdr.detectChanges();
          },
          error: (err) => {
            delete this.updatingOrders[orderId];
            this.cdr.detectChanges();
          }
        });

        // Refresh listings and wishlist so the product status updates instantly
        if (this.user?.id) {
          this.loadUserListings(this.user.id);
        }
        this.loadWishlist();
      },
      error: (err) => {
        console.error('Error updating order:', err);
        delete this.updatingOrders[orderId];
        this.cdr.detectChanges();
      }
    });
  }

  getPurchases(): OrderSummary[] {
    if (!this.user) return [];
    return this.myOrders.filter((o: any) => o.buyerId === this.user?.id);
  }

  get activePurchasesCount(): number {
    return this.getPurchases().filter(o => !this.dismissedOrderIds.has(o.id)).length;
  }

  getSales(): OrderSummary[] {
    if (!this.user) return [];
    return this.myOrders.filter((o: any) => o.sellerId === this.user?.id);
  }

  get activeSalesCount(): number {
    return this.getSales().filter(o => !this.dismissedOrderIds.has(o.id)).length;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToTabsSectionDirectly();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.scrollToTabsSectionDirectly();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.scrollToTabsSectionDirectly();
    }
  }

  selectTab(tab: 'products' | 'drafts' | 'wishlist' | 'reviews' | 'orders' | 'blocked'): void {
    this.activeTab = tab;
    this.currentPage = 1; // Reset products page on tab switch
    this.showAllListingsMobile = false; // Reset slider expansion
    if (tab === 'blocked') {
      this.loadBlockedUsers();
    }
    const url = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    }).toString();
    this.location.go(url);
    this.scrollToTabsSectionDirectly();
  }

  loadBlockedUsers() {
    this.chatService.getBlockedUsers().subscribe({
      next: (list) => {
        this.blockedUsers = list;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching blocked users:', err)
    });
  }

  unblockUser(userId: string) {
    this.chatService.unblockUser(userId).subscribe({
      next: () => {
        this.blockedUsers = this.blockedUsers.filter(u => u.id !== userId);
        this.toastService.success('User unblocked successfully.');
        this.cdr.detectChanges();
      },
      error: () => this.toastService.error('Failed to unblock user.')
    });
  }

  viewAllReviews(): void {
    if (this.user?.id) {
      this.router.navigate(['/profile', this.user.id, 'reviews']);
    }
  }

  scrollToTabsSectionDirectly(): void {
    if (this.tabsSection) {
      this.tabsSection.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
