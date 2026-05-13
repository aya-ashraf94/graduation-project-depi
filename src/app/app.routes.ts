import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ── Public Routes ────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home-page/home').then((m) => m.Home),
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login').then((m) => m.Login),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/pages/register-page/register').then((m) => m.Register),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/product/pages/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/product/pages/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/pages/search-results/search-results').then((m) => m.SearchResults),
  },
  {
    path: 'guidelines',
    loadComponent: () =>
      import('./features/support/pages/guidelines/guidelines').then((m) => m.Guidelines),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/support/pages/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'faq',
    loadComponent: () =>
      import('./features/support/pages/faq/faq').then((m) => m.Faq),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/support/pages/terms/terms').then((m) => m.Terms),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/support/pages/privacy/privacy').then((m) => m.Privacy),
  },

  // ── Protected Routes (require login) ────────────────────────────────────
  // IMPORTANT: 'profile/me' MUST come before 'profile/:id' so Angular
  // doesn't match the literal "me" as a dynamic :id parameter.
  {
    path: 'profile/me',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/pages/my-profile/my-profile').then((m) => m.MyProfile),
  },
  {
    path: 'profile/:id',
    loadComponent: () =>
      import('./features/profile/pages/my-profile/my-profile').then((m) => m.MyProfile),
  },
  {
    path: 'listings/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/product/pages/create-listing/create-listing').then((m) => m.CreateListing),
  },
  {
    path: 'listings/edit/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/product/pages/edit-listing/edit-listing').then((m) => m.EditListing),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/chat/pages/chat-page/chat-page').then((m) => m.ChatPage),
  },

  // ── Fallback ─────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./features/support/pages/not-found/not-found').then((m) => m.NotFound),
  },
];
