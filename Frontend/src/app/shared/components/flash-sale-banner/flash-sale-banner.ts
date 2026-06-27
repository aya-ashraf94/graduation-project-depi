import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FlashSaleService } from '../../../core/services/flash-sale.service';

@Component({
  selector: 'app-flash-sale-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './flash-sale-banner.html',
  styleUrl: './flash-sale-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashSaleBannerComponent implements OnInit, OnDestroy {
  flashSaleService = inject(FlashSaleService);
  private cdr = inject(ChangeDetectorRef);

  timeDisplay = signal('');

  private timerId: any = null;

  ngOnInit(): void {
    this.updateTimer();
    this.timerId = setInterval(() => this.updateTimer(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }

  get sales() {
    return this.flashSaleService.activeSales();
  }

  private updateTimer(): void {
    const data = this.flashSaleService.activeSales();
    if (data.length === 0) {
      this.timeDisplay.set('');
      return;
    }
    const earliestEnd = Math.min(...data.map(s => new Date(s.endDate).getTime()));
    const now = Date.now();
    const diff = earliestEnd - now;
    if (diff <= 0) {
      this.timeDisplay.set('Ended');
      this.flashSaleService.refreshActiveSales();
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (hours > 0) {
      this.timeDisplay.set(`${hours}h ${minutes}m ${seconds}s`);
    } else {
      this.timeDisplay.set(`${minutes}m ${seconds}s`);
    }
    this.cdr.markForCheck();
  }
}
