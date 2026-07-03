import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductSummary } from '../../../core/models/product.model';
import { WishlistService } from '../../../core/services/wishlist.service';
import { CompareService } from '../../../core/services/compare.service';
import { AuthService } from '../../../core/services/auth';
import { ImageFallbackDirective } from '../../directives/image-fallback.directive';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { getConditionLabel, getConditionClass } from '../../utils/condition.utils';
import { StatusBadgeComponent } from '../status-badge/status-badge';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, ImageFallbackDirective, CurrencyFormatPipe, TimeAgoPipe, StatusBadgeComponent],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ProductCardComponent {
  readonly product = input.required<any>();
  readonly variant = input<'home' | 'list' | 'profile' | 'carousel'>('list');
  readonly isOwnProfile = input<boolean>(false);

  readonly wishlistToggle = output<any>();
  readonly editClick = output<any>();
  readonly deleteClick = output<any>();

  readonly wishlistService = inject(WishlistService);
  readonly compareService = inject(CompareService);
  readonly authService = inject(AuthService);

  getConditionLabel(cond: string): string {
    return getConditionLabel(cond);
  }

  getConditionClass(cond: string): string {
    return getConditionClass(cond);
  }

  onWishlistToggle(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.wishlistToggle.emit(this.product());
  }

  onCompareToggle(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const p = this.product();
    this.compareService.toggle({
      id: p.id,
      thumbnail: p.thumbnail || '',
      title: p.title || '',
      price: p.price || 0,
    });
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.editClick.emit(this.product());
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.deleteClick.emit(this.product());
  }
}
