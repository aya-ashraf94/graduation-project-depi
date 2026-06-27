import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rating-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="rating-display" [class.rating-interactive]="interactive()" [class.rating-sm]="size() === 'sm'" [class.rating-lg]="size() === 'lg'">
      @if (interactive()) {
        @for (star of [1,2,3,4,5]; track star) {
          <input type="radio" [id]="'star' + star" [value]="star" [checked]="(value() || rating()) === star" (change)="onStarClick(star)" />
          <label [for]="'star' + star" [class.active]="star <= (value() || rating())">
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </label>
        }
      } @else {
        @for (star of [1,2,3,4,5]; track star) {
          <span class="star" [class.filled]="star <= rounded()" [class.half]="!filledOnly(star)">
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </span>
        }
      }
      @if (showNumeric() && rating() != null) {
        <span class="rating-value">{{ rating() | number:'1.1-1' }}</span>
      }
      @if (count() != null) {
        <span class="rating-count">({{ count() }} review{{ count() !== 1 ? 's' : '' }})</span>
      }
    </span>
  `,
  styles: [`
    .rating-display {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      color: var(--yellow, #e8bd18);
    }
    .star, .rating-display label {
      display: inline-flex;
      width: 1em;
      height: 1em;
      cursor: default;
    }
    .star.filled { color: var(--yellow, #e8bd18); }
    .star:not(.filled) { color: var(--gray-3, #999); }
    .rating-value {
      font-weight: 700;
      font-size: inherit;
      margin-left: 0.3rem;
      color: var(--black, #111);
    }
    .rating-count {
      font-size: 0.8em;
      color: var(--gray-3, #888);
      margin-left: 0.25rem;
    }

    /* Interactive mode */
    .rating-interactive {
      display: inline-flex;
      flex-direction: row-reverse;
      gap: 0.15rem;
    }
    .rating-interactive input { display: none; }
    .rating-interactive label {
      width: 1.5em;
      height: 1.5em;
      cursor: pointer;
      color: var(--gray-3, #ccc);
      transition: color 0.15s;
    }
    .rating-interactive label:hover,
    .rating-interactive label:hover ~ label,
    .rating-interactive label.active,
    .rating-interactive input:checked ~ label {
      color: var(--yellow, #e8bd18);
    }

    /* Sizes */
    .rating-sm .star,
    .rating-sm label { width: 0.8em; height: 0.8em; }
    .rating-sm .rating-value { font-size: 0.85rem; }

    .rating-lg .star,
    .rating-lg label { width: 1.8em; height: 1.8em; }
    .rating-lg .rating-value { font-size: 1.5rem; }
  `]
})
export class RatingDisplayComponent {
  readonly rating = input<number>(0);
  readonly count = input<number | null>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly showNumeric = input(false);
  readonly interactive = input(false);
  readonly value = input<number>(0);

  readonly rounded = computed(() => Math.round(this.rating()));

  filledOnly(star: number): boolean {
    return star <= Math.floor(this.rating());
  }

  onStarClick(star: number) {
    // Child can bind to input change event for reactive forms
  }
}
