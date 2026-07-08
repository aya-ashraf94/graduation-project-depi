import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // ── Public Routes ────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home-page/home').then((m) => m.Home),
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full',
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
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/product/pages/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'products/compare',
    loadComponent: () =>
      import('./features/product/pages/compare-page/compare-page').then((m) => m.ComparePage),
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
    redirectTo: 'support',
    pathMatch: 'full'
  },
  {
    path: 'help',
    redirectTo: 'support?tab=help',
    pathMatch: 'full'
  },
  {
    path: 'terms',
    redirectTo: 'support?tab=terms',
    pathMatch: 'full'
  },
  {
    path: 'privacy',
    redirectTo: 'support?tab=privacy',
    pathMatch: 'full'
  },
  {
    path: 'support',
    loadComponent: () =>
      import('./features/support/pages/support-center/support-center').then((m) => m.SupportCenter),
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
    path: 'profile/:id/reviews',
    loadComponent: () =>
      import('./features/profile/pages/all-reviews/all-reviews').then((m) => m.AllReviews),
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
  {
    path: 'scratch-card',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scratch-card/scratch-card').then((m) => m.ScratchCard),
  },

  // ── Admin Routes ─────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/layout/admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/pages/users/users').then((m) => m.Users),
      },
      {
        path: 'listings',
        loadComponent: () =>
          import('./features/admin/pages/listings/listings').then((m) => m.Listings),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/pages/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/pages/orders/orders').then((m) => m.Orders),
      },
      {
        path: 'coupons',
        loadComponent: () =>
          import('./features/admin/pages/coupons/coupons').then((m) => m.Coupons),
      },
      {
        path: 'flash-sales',
        loadComponent: () =>
          import('./features/admin/pages/flash-sales/flash-sales').then((m) => m.AdminFlashSales),
      },
      {
        path: 'payouts',
        loadComponent: () =>
          import('./features/admin/pages/payouts/payouts').then((m) => m.AdminPayouts),
      },
      {
        path: 'refunds',
        loadComponent: () =>
          import('./features/admin/pages/refunds/refunds').then((m) => m.AdminRefunds),
      },
      {
        path: 'tiers',
        loadComponent: () =>
          import('./features/admin/pages/tiers/tiers').then((m) => m.AdminTiers),
      },
    ],
  },

  // ── Fallback ─────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./features/support/pages/not-found/not-found').then((m) => m.NotFound),
  },
];
