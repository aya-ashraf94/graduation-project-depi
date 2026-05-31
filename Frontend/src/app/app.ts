import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { Navbar } from './shared/components/navbar/navbar';
import { Footer } from './shared/components/footer/footer';
import { Toast } from './shared/components/toast/toast';
import { Confirm } from './shared/components/confirm/confirm';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, Navbar, Footer, Toast, Confirm],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private router = inject(Router);
  protected readonly title = signal('nefisant-app');
  isAuthRoute = signal(false);
  isChatRoute = signal(false);
  isAdminRoute = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Check if current URL is under the /auth/ path
      this.isAuthRoute.set(event.urlAfterRedirects?.includes('/auth/') || event.url?.includes('/auth/'));
      this.isChatRoute.set(event.urlAfterRedirects?.includes('/chat') || event.url?.includes('/chat'));
      this.isAdminRoute.set(event.urlAfterRedirects?.startsWith('/admin') || event.url?.startsWith('/admin'));
    });
  }
}
