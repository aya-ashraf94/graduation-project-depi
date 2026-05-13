import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found-page">
      <div class="not-found-content">
        <div class="error-code">404</div>
        <h1 class="error-title">PAGE NOT FOUND</h1>
        <p class="error-desc">The page you're looking for doesn't exist or has been moved.</p>
        <div class="error-actions">
          <a routerLink="/" class="btn btn-primary">GO HOME</a>
          <a routerLink="/products" class="btn btn-outline">BROWSE MARKETPLACE</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-page {
      min-height: calc(100vh - var(--navbar-height));
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface);
      padding: 32px;
    }

    .not-found-content {
      text-align: center;
      max-width: 500px;
    }

    .error-code {
      font-family: var(--font-primary);
      font-size: 10rem;
      font-weight: 900;
      line-height: 1;
      color: var(--yellow);
      -webkit-text-stroke: 3px var(--black);
      paint-order: stroke fill;
      margin-bottom: 8px;
    }

    .error-title {
      font-family: var(--font-primary);
      font-size: 2rem;
      font-weight: 900;
      letter-spacing: 2px;
      margin-bottom: 16px;
    }

    .error-desc {
      font-size: 1rem;
      color: var(--gray-3);
      margin-bottom: 32px;
      line-height: 1.5;
    }

    .error-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    @media (max-width: 480px) {
      .error-code { font-size: 6rem; }
      .error-title { font-size: 1.4rem; }
      .error-actions { flex-direction: column; }
    }
  `],
})
export class NotFound {}
