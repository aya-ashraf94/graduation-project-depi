import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyFormatPipe } from '../../../pipes/currency-format.pipe';

@Component({
  selector: 'app-sale-price-display',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe],
  template: `
    @if (isOnSale()) {
      <span class="pc-sale-price">{{ salePrice() | currencyFormat }}</span>
      <span class="pc-orig-price">{{ originalPrice() || price() | currencyFormat }}</span>
    } @else {
      <ng-content />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SalePriceDisplayComponent {
  readonly isOnSale = input(false);
  readonly salePrice = input<number | undefined | null>(undefined);
  readonly originalPrice = input<number | undefined | null>(undefined);
  readonly price = input<number>(0);
}
