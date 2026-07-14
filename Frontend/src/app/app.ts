import { Component, signal, inject, OnDestroy, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { io } from 'socket.io-client';

import { Navbar } from './shared/components/navbar/navbar';
import { Footer } from './shared/components/footer/footer';
import { Toast } from './shared/components/toast/toast';
import { Confirm } from './shared/components/confirm/confirm';
import { LuckyCat } from './shared/components/lucky-cat/lucky-cat';
import { FlashSaleBannerComponent } from './shared/components/flash-sale-banner/flash-sale-banner';
import { CustomCursor } from './shared/components/custom-cursor/custom-cursor';
import { LoadingScreen } from './shared/components/loading-screen/loading-screen';
import { ScrollToTop } from './shared/components/scroll-to-top/scroll-to-top';
import { CompareBarComponent } from './shared/components/compare-bar/compare-bar';
import { OfferService } from './core/services/offer.service';
import { FlashSaleService } from './core/services/flash-sale.service';
import { AuthService } from './core/services/auth';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, Navbar, Footer, Toast, Confirm, LuckyCat, FlashSaleBannerComponent, CustomCursor, LoadingScreen, ScrollToTop, CompareBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  offerService = inject(OfferService);
  private flashSaleService = inject(FlashSaleService);
  protected readonly title = signal('nefisant-app');
  showLoading = signal(true);
  isAuthRoute = signal(false);
  isChatRoute = signal(false);
  isAdminRoute = signal(false);
  isListingFormRoute = signal(false);
  isCompareRoute = signal(false);
  shouldShowLuckyCat = signal(false);
  shouldShowFlashBanner = signal(false);
  private _routeShowsCat = signal(false);

  flashSaleAlert = signal<{ title: string; body: string; saleId: string; endsInMinutes: number; discountPercent: number } | null>(null);

  private socket: any;

  constructor() {
    let previousUrl = '';
    let currentUrl = this.router.url;

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url || '';
      
      // Update previous URL before updating current
      if (currentUrl && currentUrl !== url) {
        previousUrl = currentUrl;
        sessionStorage.setItem('previousUrl', previousUrl);
      }
      currentUrl = url;

      this.isAuthRoute.set(url.includes('/auth/'));
      this.isChatRoute.set(url.includes('/chat'));
      this.isAdminRoute.set(url.startsWith('/admin'));
      this.isListingFormRoute.set(url.includes('/listings/edit') || url.includes('/listings/create'));
      this.isCompareRoute.set(url.startsWith('/products/compare'));
      this.shouldShowFlashBanner.set(
        !url.includes('/auth/') && !url.startsWith('/admin')
      );

      const cleanUrl = url.split('?')[0];
      const isHome = cleanUrl === '/' || cleanUrl === '/home' || cleanUrl === '';
      const isMarketplaceOrDetail = cleanUrl === '/products' || cleanUrl.startsWith('/products/');
      this._routeShowsCat.set(isHome || isMarketplaceOrDetail);
    });

    // Hide lucky cat when flash sales are active (flash sale already gives best price)
    effect(() => {
      this.shouldShowLuckyCat.set(
        this._routeShowsCat() && this.flashSaleService.activeSales().length === 0
      );
    });

    const token = this.authService.token();
    const backendUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });

    this.socket.on('connect', () => {
      this.flashSaleService.refreshActiveSales();
    });

    this.socket.on('flash_sale_ending', (data: any) => {
      this.showFlashSaleAlert(data);
    });

    this.socket.on('flash_sale_ended', () => {
      this.flashSaleService.refreshActiveSales();
    });
  }

  private showFlashSaleAlert(data: any): void {
    this.flashSaleService.refreshActiveSales();

    this.flashSaleAlert.set({
      title: data.title,
      body: data.body,
      saleId: data.saleId,
      endsInMinutes: data.endsInMinutes,
      discountPercent: data.discountPercent,
    });

    setTimeout(() => this.flashSaleAlert.set(null), 10000);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.body,
        icon: '/favicon.ico',
      });
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification(data.title, {
            body: data.body,
            icon: '/favicon.ico',
          });
        }
      });
    }
  }

  dismissFlashAlert(): void {
    this.flashSaleAlert.set(null);
  }

  onLoadingDone(): void {
    this.showLoading.set(false);
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
