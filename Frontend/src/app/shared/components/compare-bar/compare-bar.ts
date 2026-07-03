import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { CompareService } from '../../../core/services/compare.service';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';

@Component({
  selector: 'app-compare-bar',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe],
  templateUrl: './compare-bar.html',
  styleUrl: './compare-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareBarComponent {
  private router = inject(Router);
  readonly compareService = inject(CompareService);

  readonly isCompareRoute = computed(() => this.router.url.startsWith('/products/compare'));
}
