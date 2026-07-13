import { Component, HostListener, inject, computed, OnInit, OnDestroy, effect, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { OfferService } from '../../../core/services/offer.service';
import { CountdownTimerService } from '../../../core/services/countdown-timer.service';

import { UserAvatarComponent } from '../user-avatar/user-avatar';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, UserAvatarComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  notificationService = inject(NotificationService);
  wishlistService = inject(WishlistService);
  offerService = inject(OfferService);
  private timerService = inject(CountdownTimerService);

  isScrolled = false;
  menuOpen = false;
  searchQuery = '';
  showNotifDropdown = false;
  showProfileDropdown = false;

  reservationTimeRemaining = signal<string>('');
  private timerIntervalId: any = null;
  private refreshIntervalId: any = null;
  private destroy$ = new Subject<void>();

  readonly isChatRoute = signal(false);

  // Expose auth state directly to the template
  readonly isLoggedIn = this.authService.isLoggedIn;
  readonly currentUser = this.authService.currentUser;

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.isChatRoute.set(this.router.url.includes('/chat'));
    });
    this.isChatRoute.set(this.router.url.includes('/chat'));

    effect(() => {
      const logged = this.isLoggedIn();
      if (logged) {
        this.offerService.checkActiveReservation();
      } else {
        this.offerService.activeReservation.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.timerIntervalId = setInterval(() => {
      const active = this.offerService.activeReservation();
      if (active && active.expiresAt) {
        const timeStr = this.timerService.formatTimeRemaining(active.expiresAt);
        this.reservationTimeRemaining.set(timeStr);
        if (timeStr === 'Expired') {
          this.offerService.activeReservation.set(null);
        }
      }
    }, 1000);

    this.refreshIntervalId = setInterval(() => {
      if (this.isLoggedIn()) {
        this.offerService.checkActiveReservation();
      }
    }, 60000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    if (this.refreshIntervalId) clearInterval(this.refreshIntervalId);
  }

  readonly unreadMessagesCount = computed(() => {
    const user = this.currentUser();
    if (!user) return 0;
    return this.notificationService.getNotifications(user.id)
      .filter(n => !n.isRead && n.type === 'message').length;
  });

  /** Reactive notifications (top 15, sorted) */
  readonly notifications = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    return this.notificationService.getNotifications(user.id).slice(0, 15);
  });

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 20;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notif-wrap')) {
      this.showNotifDropdown = false;
    }
    if (!target.closest('.profile-dropdown-wrap')) {
      this.showProfileDropdown = false;
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  closeMenu(): void {
    this.menuOpen = false;
    document.body.style.overflow = '';
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  closeProfileDropdown(): void {
    this.showProfileDropdown = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
    this.closeMenu();
  }

  submitSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery.trim() } });
      this.searchQuery = '';
      this.closeMenu();
    }
  }

  toggleNotifications(): void {
    this.showNotifDropdown = !this.showNotifDropdown;
  }

  markAllRead(): void {
    const user = this.currentUser();
    if (user) this.notificationService.markAllAsRead(user.id);
  }

  onNotifClick(notif: any): void {
    this.notificationService.markAsRead(notif.id);
    this.showNotifDropdown = false;
    if (notif.linkedRoute) {
      if (notif.type === 'message' && notif.linkedEntityId) {
        this.router.navigate([notif.linkedRoute], { queryParams: { conversationId: notif.linkedEntityId } });
      } else {
        this.router.navigateByUrl(notif.linkedRoute);
      }
    }
  }

  goToWishlist(): void {
    this.router.navigate(['/profile/me'], { queryParams: { tab: 'wishlist' } });
    this.closeMenu();
  }
}
