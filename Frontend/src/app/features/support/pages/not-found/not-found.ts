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
      padding: 2rem;
    }

    .not-found-content {
      text-align: center;
      max-width: 31.25rem;
    }

    .error-code {
      font-family: var(--font-primary);
      font-size: 6rem;
      font-weight: 900;
      line-height: 1;
      color: var(--yellow);
      -webkit-text-stroke: 3px var(--black);
      paint-order: stroke fill;
      margin-bottom: 0.5rem;
    }

    .error-title {
      font-family: var(--font-primary);
      font-size: 1.4rem;
      font-weight: 900;
      letter-spacing: 0.16em;
      margin-bottom: 1rem;
    }

    .error-desc {
      font-size: 1rem;
      color: var(--gray-3);
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .error-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-direction: column;
    }

    @media (min-width: 481px) {
      .error-code { font-size: 10rem; }
      .error-title { font-size: 2rem; }
      .error-actions { flex-direction: row; }
    }
  `],
})
export class NotFound {}
