import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WalletService, WalletStats, PayoutRequest } from '../../../../core/services/wallet.service';
import { TierService, SubscriptionInfo } from '../../../../core/services/tier.service';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';

declare const Stripe: any;

@Component({
  selector: 'app-earnings-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyFormatPipe],
  templateUrl: './earnings-page.html',
  styleUrl: './earnings-page.css',
})
export class EarningsPage implements OnInit, AfterViewInit, OnDestroy {
  private walletService = inject(WalletService);
  private tierService = inject(TierService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('cardElement') cardElementRef!: ElementRef;
  private destroy$ = new Subject<void>();

  isLoading = true;
  walletStats: WalletStats | null = null;
  payoutsList: PayoutRequest[] = [];
  subscriptionInfo: SubscriptionInfo | null = null;
  availableTiers: any[] = [];

  get paidTiers(): any[] {
    return this.availableTiers.filter(t => t.monthlyPrice > 0);
  }

  payoutForm = {
    amount: 0,
    paymentMethod: 'bank_transfer' as string,
    paymentDetails: '',
  };
  requestingPayout = false;

  showTierModal = false;
  selectedTierId = '';
  selectedBillingCycle: 'monthly' | 'yearly' = 'monthly';
  subscribing = false;

  showCancelModal = false;
  showReactivateModal = false;

  // Stripe
  stripe: any = null;
  card: any = null;
  showCardPayment = false;
  clientSecret = '';

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    if (typeof Stripe !== 'undefined') {
      this.stripe = Stripe(environment.stripePublishableKey);
    }
  }

  private loadData() {
    this.isLoading = true;
    this.walletService.getWalletStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.walletStats = stats;
        this.cdr.detectChanges();
      },
      error: () => this.isLoading = false
    });
    this.walletService.getPayouts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.payoutsList = list;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
    this.tierService.getMySubscription().pipe(takeUntil(this.destroy$)).subscribe({
      next: (info) => { this.subscriptionInfo = info; this.cdr.detectChanges(); },
      error: () => {}
    });
    this.tierService.getActiveTiers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (tiers) => { this.availableTiers = tiers; this.cdr.detectChanges(); this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  getPaymentLabel(method: string | undefined): string {
    const labels: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      vodafone_cash: 'Mobile Cash',
      instapay: 'Instapay',
      paypal: 'PayPal',
    };
    return labels[method || ''] || method || '';
  }

  submitPayoutRequest() {
    if (!this.payoutForm.amount || this.payoutForm.amount <= 0) {
      this.toastService.error('Please enter a valid amount');
      return;
    }
    if (!this.payoutForm.paymentDetails.trim()) {
      this.toastService.error('Please enter payout destination details');
      return;
    }
    if (this.walletStats && this.payoutForm.amount > this.walletStats.balance) {
      this.toastService.error('Insufficient balance');
      return;
    }

    this.requestingPayout = true;
    this.walletService.requestPayout(
      this.payoutForm.amount,
      this.payoutForm.paymentMethod,
      this.payoutForm.paymentDetails
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Payout request submitted!');
        this.payoutForm.amount = 0;
        this.payoutForm.paymentDetails = '';
        this.requestingPayout = false;
        this.loadData();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to submit payout request');
        this.requestingPayout = false;
      }
    });
  }

  // ── Subscription ──

  openTierModal() {
    this.selectedTierId = '';
    this.selectedBillingCycle = 'monthly';
    this.showTierModal = true;
  }

  closeTierModal() {
    this.showTierModal = false;
    this.showCardPayment = false;
    this.clientSecret = '';
    this.selectedTierId = '';
    if (this.card) {
      this.card.destroy();
      this.card = null;
    }
  }

  get selectedTierDetails(): any {
    return this.availableTiers.find(t => t.id === this.selectedTierId) || null;
  }

  get tierColors(): Record<string, { bg: string, border: string, accent: string, icon: string }> {
    return {
      'Free': { bg: '#f3f4f6', border: '#d1d5db', accent: '#6b7280', icon: '📄' },
      'Bronze': { bg: '#fff7ed', border: '#d97706', accent: '#9a3412', icon: '🥉' },
      'Silver': { bg: '#f0f9ff', border: '#0284c7', accent: '#0369a1', icon: '🥈' },
      'Gold': { bg: '#fefce8', border: '#eab308', accent: '#854d0e', icon: '🥇' },
    };
  }

  tierStyle(tier: any): any {
    const c = this.tierColors[tier.name] || this.tierColors['Free'];
    return {
      background: c.bg,
      'border-color': c.border,
      '--tier-accent': c.accent,
    };
  }

  tierPrice(tier: any): number {
    return this.selectedBillingCycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
  }

  savingsVsFree(tier: any): string {
    const globalFee = 8;
    const tierFee = tier.feePercent != null ? tier.feePercent : globalFee;
    if (tierFee >= globalFee) return '';
    const saving = ((globalFee - tierFee) / globalFee * 100).toFixed(0);
    return `Save ${saving}% on every sale`;
  }

  isCurrentTier(tier: any): boolean {
    return this.subscriptionInfo?.tier?.id === tier.id;
  }

  subscribeToTier() {
    if (!this.selectedTierId) return;
    this.subscribing = true;

    const selectedTier = this.selectedTierDetails;
    const price = this.selectedBillingCycle === 'monthly' ? selectedTier?.monthlyPrice : selectedTier?.yearlyPrice;

    if (price > 0 && this.stripe && this.cardElementRef) {
      // Pay via Stripe
      this.tierService.createSubscriptionPaymentIntent(this.selectedTierId, this.selectedBillingCycle).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          this.clientSecret = res.clientSecret;
          this.showCardPayment = true;
          this.subscribing = false;
          this.cdr.detectChanges();

          setTimeout(() => {
            const elements = this.stripe.elements();
            this.card = elements.create('card', { style: { base: { fontSize: '16px' } } });
            this.card.mount(this.cardElementRef.nativeElement);
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.toastService.error(err?.error?.message || 'Failed to initialize payment');
          this.subscribing = false;
        }
      });
    } else {
      // Free tier or wallet balance payment
      this.tierService.subscribe(this.selectedTierId, this.selectedBillingCycle).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastService.success('Subscription activated!');
          this.closeTierModal();
          this.loadData();
          this.subscribing = false;
        },
        error: (err) => {
          this.toastService.error(err?.error?.message || 'Subscription failed');
          this.subscribing = false;
        }
      });
    }
  }

  confirmCardPayment() {
    if (!this.stripe || !this.card || !this.clientSecret) return;
    this.subscribing = true;
    this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: { card: this.card },
    }).then((result: any) => {
      if (result.error) {
        this.toastService.error(result.error.message || 'Card payment failed');
        this.subscribing = false;
      } else {
        this.tierService.confirmSubscriptionPayment(
          result.paymentIntent.id,
          this.selectedTierId,
          this.selectedBillingCycle
        ).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.toastService.success('Subscription activated!');
            this.closeTierModal();
            this.loadData();
            this.subscribing = false;
          },
          error: (err) => {
            this.toastService.error(err?.error?.message || 'Subscription confirmation failed');
            this.subscribing = false;
          }
        });
      }
    });
  }

  openCancelModal() {
    this.showCancelModal = true;
  }

  closeCancelModal() {
    this.showCancelModal = false;
  }

  confirmCancel() {
    this.subscribing = true;
    this.tierService.cancelSubscription(false).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const refundMsg = res?.refundAmount > 0 ? ` — $${res.refundAmount.toFixed(2)} refunded` : '';
        this.toastService.success('Subscription cancelled, reverted to Free tier' + refundMsg);
        this.closeCancelModal();
        this.subscribing = false;
        this.loadData();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to cancel');
        this.subscribing = false;
      }
    });
  }

  openReactivateModal() {
    this.showReactivateModal = true;
  }

  closeReactivateModal() {
    this.showReactivateModal = false;
  }

  confirmReactivate() {
    this.tierService.toggleAutoRenew(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Auto-renew enabled — your subscription will continue');
        this.closeReactivateModal();
        this.loadData();
      },
      error: (err) => this.toastService.error(err?.error?.message || 'Failed to re-activate')
    });
  }

  get cancelDate(): string | null {
    if (this.subscriptionInfo?.expiresAt) {
      const d = new Date(this.subscriptionInfo.expiresAt);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
