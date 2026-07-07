import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'button[app-wishlist-button]',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg width="18" height="18" viewBox="0 0 24 24"
      [attr.fill]="isWishlisted() ? 'var(--danger)' : 'none'"
      stroke="currentColor" stroke-width="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.wishlisted]': 'isWishlisted()',
    '(click)': 'onClick($event)',
  },
})
export class WishlistButtonComponent {
  readonly isWishlisted = input<boolean>(false);
  readonly toggle = output<void>();

  onClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.toggle.emit();
  }
}
