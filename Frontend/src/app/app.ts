import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { Navbar } from './shared/components/navbar/navbar';
import { Footer } from './shared/components/footer/footer';
import { Toast } from './shared/components/toast/toast';
import { Confirm } from './shared/components/confirm/confirm';
import { LuckyCat } from './shared/components/lucky-cat/lucky-cat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, Navbar, Footer, Toast, Confirm, LuckyCat],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private router = inject(Router);
  protected readonly title = signal('nefisant-app');
  isAuthRoute = signal(false);
  isChatRoute = signal(false);
  isAdminRoute = signal(false);
  isListingFormRoute = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url || '';
      this.isAuthRoute.set(url.includes('/auth/'));
      this.isChatRoute.set(url.includes('/chat'));
      this.isAdminRoute.set(url.startsWith('/admin'));
      this.isListingFormRoute.set(url.includes('/listings/edit') || url.includes('/listings/create'));
    });
  }
}
