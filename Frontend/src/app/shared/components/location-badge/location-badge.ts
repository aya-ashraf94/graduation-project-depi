import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LocationProximity = 'same_district' | 'same_city' | 'same_governorate' | 'other';

@Component({
  selector: 'app-location-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span *ngIf="proximity() !== 'other'" class="loc-badge" [class]="proximity()">
      @if (proximity() === 'same_district') {
        <span class="loc-badge-content">📍 Near You</span>
      } @else if (proximity() === 'same_city') {
        <span class="loc-badge-content">🏙 Same City</span>
      } @else if (proximity() === 'same_governorate') {
        <span class="loc-badge-content">📌 Same Governorate</span>
      }
    </span>
  `,
  styles: [`
    .loc-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-family: var(--font-primary);
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .loc-badge-content {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }
    .same_district {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .same_city {
      background: #cce5ff;
      color: #004085;
      border: 1px solid #b8daff;
    }
    .same_governorate {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeeba;
    }
  `]
})
export class LocationBadgeComponent {
  proximity = input<LocationProximity>('other');
}
