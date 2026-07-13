import { Component, OnInit, AfterViewInit, OnDestroy, inject, ChangeDetectorRef, ViewChild, ElementRef, signal, computed, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth';
import { ChatService } from '../../../../core/services/chat.service';
import { ProductService } from '../../../../core/services/product.service';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { ReviewService } from '../../../../core/services/review.service';
import { UserService } from '../../../../core/services/user.service';
import { OrderService } from '../../../../core/services/order.service';
import { WalletService, WalletStats, PayoutRequest } from '../../../../core/services/wallet.service';
import { RefundService } from '../../../../core/services/refund.service';
import { FeaturedService } from '../../../../core/services/featured.service';
import { TierService } from '../../../../core/services/tier.service';

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
export class MyProfile implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private productService = inject(ProductService);
  wishlistService = inject(WishlistService);
  private reviewService = inject(ReviewService);
  private userService = inject(UserService);
  private orderService = inject(OrderService);
  private walletService = inject(WalletService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private location = inject(Location);
  private toastService = inject(ToastService);
  private refundService = inject(RefundService);
  private featuredService = inject(FeaturedService);
  private tierService = inject(TierService);
  private destroy$ = new Subject<void>();

  @ViewChild('tabsSection') tabsSection!: ElementRef;

  private shouldScrollToTabs = false;
  private isLocalTabClick = false;

  user: User | null = null;
  isOwnProfile = true;
  isLoadingProfile = true;
  myListings: ProductSummary[] = [];
  wishlistItems: ProductSummary[] = [];
  reviews: Review[] = [];
  reviewsByOrderId: Map<string, any> = new Map();
  myOrders: OrderSummary[] = [];
  reviewedOrderIds: Set<string> = new Set();
  myRefundRequests: any[] = [];
  showDisputeModal = false;
  selectedOrderForDispute: OrderSummary | null = null;
  disputeReason = '';
  submittingDispute = false;
  showRateBuyerModal = false;
  selectedOrderForRateBuyer: OrderSummary | null = null;
  buyerRating = 5;
  buyerReviewComment = '';
  submittingBuyerRating = false;
  dismissedOrderIds: Set<string> = new Set();
  expandedOrderIds: Set<string> = new Set();
  activeTab: 'products' | 'drafts' | 'wishlist' | 'reviews' | 'orders' | 'blocked' = 'products';
  blockedUsers: any[] = [];

  // Wallet / Payout states
  walletStats: WalletStats | null = null;
  payoutsList: PayoutRequest[] = [];
  payoutForm = {
    amount: 0,
    paymentMethod: 'bank_transfer',
    paymentDetails: '',
  };
  requestingPayout = false;

  // Refund state
  showRefundModal = false;
  selectedOrderForRefund: OrderSummary | null = null;
  refundReason = '';
  refundDetails = '';
  submittingRefund = false;

  // Featured/Promote state
  showPromoteModal = false;
  selectedProductForPromote: ProductSummary | null = null;
  featuredPrices: { [key: number]: number } = { 2: 5, 7: 12, 14: 20 };
  selectedDuration = 7;
  promoting = false;
  featuredQuota: { total: number; used: number; remaining: number; tierName: string | null; freeDuration: number } | null = null;
  featuredPricesLoaded = false;
  loadingQuota = false;
  myFeaturedListings: any[] = [];
  showMyFeatured = false;

  isViewerBlocked = false;
  isPartnerBlockedByMe = false;
  orderView: 'purchases' | 'sales' = 'purchases';
  orderStatusFilter: string = 'all';

  // Products Pagination state
  currentPage = 1;
  pageSize = 8;
  openCardMenuId: string | null = null;

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

  get userLocationDisplay(): string {
    if (!this.user) return '';
    if (this.user.location) return this.user.location;
    const parts: string[] = [];
    if (this.user.district) parts.push(this.user.district);
    if (this.user.city) parts.push(this.formatId(this.user.city));
    if (this.user.governorate) parts.push(this.formatId(this.user.governorate));
    return parts.join(', ');
  }

  private formatId(id: string): string {
    if (!id) return '';
    return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  @HostListener('window:resize')
  onResize(): void {
    this.cdr.detectChanges();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openCardMenuId = null;
    this.cdr.markForCheck();
  }

  goToAdminPanel() {
    this.router.navigate(['/admin']);
  }

  toggleCardMenu(id: string): void {
    this.openCardMenuId = this.openCardMenuId === id ? null : id;
    this.cdr.markForCheck();
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

    this.productService.deleteProduct(id).pipe(takeUntil(this.destroy$)).subscribe({
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
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
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
        this.userService.getUserById(id).pipe(takeUntil(this.destroy$)).subscribe({
          next: (user) => {
            this.user = user;
            this.isLoadingProfile = false;
            this.isViewerBlocked = false;
            if (user && user.id) {
              const currentId = this.authService.currentUser()?.id;
              if (user.id === currentId) {
                this.isOwnProfile = true;
                this.loadUserListings(user.id);
                this.reviewService.getReviewsForUser(user.id).pipe(takeUntil(this.destroy$)).subscribe(revs => {
                  this.reviews = this.formatReviews(revs);
                  this.cdr.detectChanges();
                });
              } else {
                this.isOwnProfile = false;
                this.chatService.checkBlockStatus(user.id).pipe(takeUntil(this.destroy$)).subscribe({
                  next: (status) => {
                    this.isViewerBlocked = status.isBlockedByPartner;
                    this.isPartnerBlockedByMe = status.isBlocked;
                    if (!this.isViewerBlocked) {
                      this.loadUserListings(user.id);
                      this.reviewService.getReviewsForUser(user.id).pipe(takeUntil(this.destroy$)).subscribe(revs => {
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
          this.userService.getUserById(currentUser.id).pipe(takeUntil(this.destroy$)).subscribe({
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
          this.reviewService.getReviewsForUser(currentUser.id).pipe(takeUntil(this.destroy$)).subscribe(revs => {
            this.reviews = this.formatReviews(revs);
            this.reviewsByOrderId = new Map(revs.filter((r: any) => r.orderId).map((r: any) => [r.orderId, r]));
            this.cdr.detectChanges();
          });
        } else {
          this.isLoadingProfile = false;
        }
      }
    });

    // Handle Tabs (reading from query params)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tab = params['tab'];
      if (tab === 'products' || tab === 'drafts' || tab === 'wishlist' || tab === 'reviews' || tab === 'orders' || tab === 'blocked') {
        this.activeTab = tab;
        if (tab === 'blocked') {
          this.loadBlockedUsers();
        }
        if (tab === 'orders' && this.isOwnProfile) {
          this.loadOrdersData();
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
    this.productService.getProductsBySeller(userId).pipe(takeUntil(this.destroy$)).subscribe({
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
    this.wishlistService.getWishlistProducts().pipe(takeUntil(this.destroy$)).subscribe({
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

    this.reviewService.createReview(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (rev) => {
        this.reviewLoading = false;
        this.reviewSuccess.set('Review submitted successfully!');

        // Mark order as reviewed in the local set so the button disappears immediately
        if (this.selectedOrderForReview) {
          this.reviewedOrderIds.add(this.selectedOrderForReview.id);
        }

        // Refresh reviews displayed on profile
        if (this.user?.id) {
          this.reviewService.getReviewsForUser(this.user.id).pipe(takeUntil(this.destroy$)).subscribe(revs => {
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

    const order = this.myOrders.find((o: any) => o.id === orderId);
    const payload: any = { status };
    if (status === 'shipped' && order?._trackingValue) {
      payload.trackingNumber = order._trackingValue;
    }

    this.orderService.updateOrder(orderId, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        // Update the order in-place instead of re-fetching all orders
        const idx = this.myOrders.findIndex((o: any) => o.id === orderId);
        if (idx !== -1) {
          this.myOrders[idx] = { ...this.myOrders[idx], status: updated.status, trackingNumber: updated.trackingNumber || this.myOrders[idx].trackingNumber };
        }
        delete this.updatingOrders[orderId];
        this.cdr.detectChanges();

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
    if (tab === 'orders' && this.isOwnProfile) {
      this.loadOrdersData();
    }
    const url = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    }).toString();
    this.location.go(url);
    this.scrollToTabsSectionDirectly();
  }

  loadWalletData() {
    if (!this.isOwnProfile) return;
    this.walletService.getWalletStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.walletStats = stats;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading wallet stats:', err)
    });
    this.walletService.getPayouts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.payoutsList = list;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading payouts:', err)
    });
  }

  loadOrdersData(): void {
    const currentUser = this.authService.currentUser();
    this.orderService.getOrders().pipe(takeUntil(this.destroy$)).subscribe(orders => {
      this.myOrders = orders;
      this.cdr.detectChanges();
    });
    if (currentUser) {
      this.reviewService.getReviewsByUser(currentUser.id).pipe(takeUntil(this.destroy$)).subscribe(written => {
        this.reviewedOrderIds = new Set(written.map((r: any) => r.orderId?._id || r.orderId || r.id));
        this.cdr.detectChanges();
      });
      this.refundService.getMyRefundRequests().pipe(takeUntil(this.destroy$)).subscribe(refs => {
        this.myRefundRequests = refs;
        this.cdr.detectChanges();
      });
    }
  }

  submitPayoutRequest() {
    if (!this.payoutForm.amount || this.payoutForm.amount <= 0) {
      this.toastService.error('Please enter a valid amount');
      return;
    }
    if (!this.payoutForm.paymentDetails.trim()) {
      this.toastService.error('Please enter payout destination details');
      return;
    }
    if (this.walletStats && this.payoutForm.amount > this.walletStats.balance) {
      this.toastService.error('Insufficient balance');
      return;
    }

    this.requestingPayout = true;
    this.walletService.requestPayout(
      this.payoutForm.amount,
      this.payoutForm.paymentMethod,
      this.payoutForm.paymentDetails
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.toastService.success('Payout request submitted successfully!');
        this.payoutForm.amount = 0;
        this.payoutForm.paymentDetails = '';
        this.requestingPayout = false;
        this.loadWalletData();
      },
      error: (err) => {
        console.error('Error submitting payout:', err);
        this.toastService.error(err?.error?.message || 'Failed to submit payout request');
        this.requestingPayout = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Refund Methods ─────────────────────────────────────────────
  openRefundModal(order: OrderSummary) {
    this.selectedOrderForRefund = order;
    this.refundReason = '';
    this.refundDetails = '';
    this.showRefundModal = true;
  }

  closeRefundModal() {
    this.showRefundModal = false;
    this.selectedOrderForRefund = null;
  }

  submitRefund() {
    if (!this.selectedOrderForRefund || !this.refundReason.trim()) {
      this.toastService.error('Please provide a reason for the refund');
      return;
    }
    this.submittingRefund = true;
    this.refundService.requestRefund(this.selectedOrderForRefund.id, this.refundReason, this.refundDetails).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Refund request submitted! Admin will review it.');
        this.closeRefundModal();
        this.submittingRefund = false;
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to submit refund request');
        this.submittingRefund = false;
      }
    });
  }

  // ── Refund Status Helper ──────────────────────────────────────
  getRefundForOrder(orderId: string): any {
    return this.myRefundRequests.find((r: any) => r.orderId === orderId);
  }

  // ── Auto-Confirm Countdown ────────────────────────────────────
  getAutoConfirmDaysRemaining(order: any): number {
    if (order.status !== 'shipped') return 0;
    const shippedAt = order.updatedAt ? new Date(order.updatedAt) : new Date();
    const elapsed = Date.now() - shippedAt.getTime();
    const remaining = Math.ceil((14 * 24 * 60 * 60 * 1000 - elapsed) / (24 * 60 * 60 * 1000));
    return Math.max(0, remaining);
  }

  // ── Dispute Methods ────────────────────────────────────────────
  openDisputeModal(order: OrderSummary) {
    this.selectedOrderForDispute = order;
    this.disputeReason = '';
    this.showDisputeModal = true;
  }

  closeDisputeModal() {
    this.showDisputeModal = false;
    this.selectedOrderForDispute = null;
  }

  submitDispute() {
    if (!this.selectedOrderForDispute || !this.disputeReason.trim()) {
      this.toastService.error('Please provide a reason for the dispute');
      return;
    }
    this.submittingDispute = true;
    this.orderService.disputeOrder(this.selectedOrderForDispute.id, this.disputeReason).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Dispute submitted. Admin will review the case.');
        this.closeDisputeModal();
        this.submittingDispute = false;
        // Update order status in-place instead of re-fetching all orders
        const idx = this.myOrders.findIndex((o: any) => o.id === this.selectedOrderForDispute?.id);
        if (idx !== -1) {
          this.myOrders[idx] = { ...this.myOrders[idx], status: 'disputed' as OrderStatus };
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to submit dispute');
        this.submittingDispute = false;
      }
    });
  }

  // ── Rate Buyer Methods ────────────────────────────────────────
  openRateBuyerModal(order: OrderSummary) {
    this.selectedOrderForRateBuyer = order;
    this.buyerRating = 5;
    this.buyerReviewComment = '';
    this.showRateBuyerModal = true;
  }

  closeRateBuyerModal() {
    this.showRateBuyerModal = false;
    this.selectedOrderForRateBuyer = null;
  }

  submitBuyerRating() {
    if (!this.selectedOrderForRateBuyer || !this.buyerReviewComment.trim()) {
      this.toastService.error('Please provide a comment');
      return;
    }
    this.submittingBuyerRating = true;
    this.reviewService.createReview({
      orderId: this.selectedOrderForRateBuyer.id,
      rating: this.buyerRating,
      comment: this.buyerReviewComment,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Buyer rating submitted!');
        this.closeRateBuyerModal();
        this.submittingBuyerRating = false;
        // Refresh written reviews to mark as reviewed
        if (this.user?.id) {
          this.reviewService.getReviewsByUser(this.user.id).pipe(takeUntil(this.destroy$)).subscribe(written => {
            this.reviewedOrderIds = new Set(written.map((r: any) => r.orderId?._id || r.orderId || r.id));
            this.cdr.detectChanges();
          });
        }
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to submit rating');
        this.submittingBuyerRating = false;
      }
    });
  }

  // ── Tier/Subscription Methods (redirect to /earnings) ──────────
  openTierModal() {
    this.router.navigate(['/earnings']);
  }

  // ── Featured/Promote Methods ───────────────────────────────────
  openPromoteModal(product: ProductSummary) {
    this.selectedProductForPromote = product;
    this.selectedDuration = 7;
    this.promoting = false;
    this.featuredQuota = null;
    this.featuredPricesLoaded = false;
    this.featuredService.getPrices().pipe(takeUntil(this.destroy$)).subscribe({
      next: (prices) => { this.featuredPrices = prices; this.featuredPricesLoaded = true; this.cdr.markForCheck(); },
      error: () => { this.featuredPricesLoaded = true; this.cdr.markForCheck(); }
    });
    this.loadingQuota = true;
    this.featuredService.getRemainingQuota().pipe(takeUntil(this.destroy$)).subscribe({
      next: (q) => { this.featuredQuota = q; this.loadingQuota = false; this.cdr.markForCheck(); },
      error: () => { this.loadingQuota = false; this.cdr.markForCheck(); }
    });
    this.loadWalletData();
    this.showPromoteModal = true;
    this.cdr.markForCheck();
  }

  closePromoteModal() {
    this.showPromoteModal = false;
    this.selectedProductForPromote = null;
  }

  get promoteCost(): number {
    const price = this.featuredPrices[this.selectedDuration] || 0;
    if ((this.featuredQuota?.remaining ?? 0) >= price) return 0;
    return price;
  }

  promoteProduct() {
    if (!this.selectedProductForPromote) return;
    this.promoting = true;
    this.featuredService.promoteProduct(this.selectedProductForPromote.id, this.selectedDuration).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success(`Product promoted for ${this.selectedDuration} days!`);
        this.closePromoteModal();
        this.loadWalletData();
        this.promoting = false;
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to promote product');
        this.promoting = false;
      }
    });
  }

  loadMyFeatured() {
    this.featuredService.getMyFeaturedListings().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => { this.myFeaturedListings = list; this.showMyFeatured = true; this.cdr.detectChanges(); },
      error: () => this.toastService.error('Failed to load featured listings')
    });
  }

  loadBlockedUsers() {
    this.chatService.getBlockedUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.blockedUsers = list;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching blocked users:', err)
    });
  }

  unblockUser(userId: string) {
    this.chatService.unblockUser(userId).pipe(takeUntil(this.destroy$)).subscribe({
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
