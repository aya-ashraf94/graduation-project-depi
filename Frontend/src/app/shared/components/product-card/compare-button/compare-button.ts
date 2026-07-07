import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'button[app-compare-button]',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.compared]': 'isCompared()',
    '(click)': 'onClick($event)',
  },
})
export class CompareButtonComponent {
  readonly isCompared = input<boolean>(false);
  readonly toggle = output<void>();

  onClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.toggle.emit();
  }
}
