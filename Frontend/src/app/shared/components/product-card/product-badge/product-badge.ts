import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getConditionLabel, getConditionClass } from '../../../utils/condition.utils';

const CONDITION_CLASSES = {
  home: 'pc-home-cond-badge',
  profile: 'pc-profile-cond',
} as const;

@Component({
  selector: 'app-product-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (variant() === 'condition') {
      <span [class]="(contextClass()) + ' ' + getConditionClass(condition())">
        {{ getConditionLabel(condition()) }}
      </span>
    }
    @if (variant() === 'official') {
      <span class="pc-badge-official">Official Store</span>
    }
    @if (variant() === 'tag' && badge()) {
      <span class="pc-badge-tag">{{ badge() }}</span>
    }
    @if (variant() === 'own') {
      <span class="pc-badge-own">Your Listing</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProductBadgeComponent {
  readonly variant = input.required<'condition' | 'official' | 'tag' | 'own'>();
  readonly context = input<'home' | 'profile'>('home');
  readonly condition = input<string>('used');
  readonly badge = input<string | undefined | null>(undefined);

  contextClass(): string {
    return CONDITION_CLASSES[this.context()] || CONDITION_CLASSES['home'];
  }

  getConditionLabel(cond: string): string {
    return getConditionLabel(cond);
  }

  getConditionClass(cond: string): string {
    return getConditionClass(cond);
  }
}
