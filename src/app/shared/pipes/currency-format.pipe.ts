// ============================================================
// CURRENCY FORMAT PIPE
// Usage: {{ product.price | currencyFormat }}
// Output: "$1,200" or "$850"
//
// Optional args:
//   {{ price | currencyFormat:'EUR':'€' }}
// ============================================================

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyFormat', standalone: true })
export class CurrencyFormatPipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    currency: string = 'USD',
    symbol: string = '$'
  ): string {
    if (value === null || value === undefined) return '';

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);

    return formatted;
  }
}
