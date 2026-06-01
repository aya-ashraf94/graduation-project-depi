import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification.service';
import { WishlistService } from '../../../core/services/wishlist.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private authService = inject(AuthService);
  private router = inject(Router);
  notificationService = inject(NotificationService);
  wishlistService = inject(WishlistService);

  isScrolled = false;
  menuOpen = false;
  searchQuery = '';
  showNotifDropdown = false;

  // Expose auth state directly to the template
  readonly isLoggedIn = this.authService.isLoggedIn;
  readonly currentUser = this.authService.currentUser;

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
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  closeMenu(): void {
    this.menuOpen = false;
    document.body.style.overflow = '';
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

  getNotifications() {
    const user = this.currentUser();
    return user ? this.notificationService.getNotifications(user.id).slice(0, 5) : [];
  }

  markAllRead(): void {
    const user = this.currentUser();
    if (user) this.notificationService.markAllAsRead(user.id);
  }

  onNotifClick(notif: any): void {
    this.notificationService.markAsRead(notif.id);
    this.showNotifDropdown = false;
    if (notif.linkedRoute) {
      this.router.navigateByUrl(notif.linkedRoute);
    }
  }

  goToWishlist(): void {
    this.router.navigate(['/profile/me'], { queryParams: { tab: 'wishlist' } });
    this.closeMenu();
  }
}
