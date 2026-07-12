import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { AdminService } from '../../../../core/services/admin.service';

import { UserAvatarComponent } from '../../../../shared/components/user-avatar/user-avatar';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, UserAvatarComponent],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.css'
})
export class AdminShell implements OnInit {
  protected authService = inject(AuthService);
  protected adminService = inject(AdminService);
  private router = inject(Router);

  isMobileMenuOpen = signal(false);
  showGuide = signal(false);

  openSection = signal<string | null>('mgmt');

  isMgmtActive(): boolean {
    const url = this.router.url;
    return url.includes('/admin/users') || url.includes('/admin/listings') || url.includes('/admin/reports');
  }
  isCommerceActive(): boolean {
    const url = this.router.url;
    return url.includes('/admin/orders') || url.includes('/admin/coupons') || url.includes('/admin/flash-sales') || url.includes('/admin/refunds') || url.includes('/admin/categories');
  }
  isFinanceActive(): boolean {
    const url = this.router.url;
    return url.includes('/admin/payouts') || url.includes('/admin/tiers');
  }

  ngOnInit(): void {
    this.adminService.refreshPendingCount();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(val => !val);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
