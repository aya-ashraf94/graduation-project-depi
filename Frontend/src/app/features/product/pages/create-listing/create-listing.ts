import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export type Condition = 'New w/ Tags' | 'Excellent' | 'Good' | 'Fair' | 'For Parts';
export type PricingMode = 'fixed' | 'trade';

@Component({
  selector: 'app-create-listing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-listing.html',
  styleUrl: './create-listing.css',
})
export class CreateListing {
  constructor(private router: Router) {}

  // ── Wizard State ────────────────────────────────────────────────────────
  currentStep = signal(1);
  readonly totalSteps = 3;

  readonly steps = [
    { num: 1, label: 'ITEM DETAILS',   sub: 'What are you selling?' },
    { num: 2, label: 'PRICING',        sub: 'Name your price & location' },
    { num: 3, label: 'CONFIRM',        sub: 'Review & publish' },
  ];

  // ── Phase 1 ─────────────────────────────────────────────────────────────
  title         = '';
  description   = '';
  category      = '';
  selectedCondition: Condition | '' = '';
  imageSlots: (string | null)[] = [null, null, null];

  // ── Phase 2 ─────────────────────────────────────────────────────────────
  pricingMode: PricingMode = 'fixed';
  price: number | null     = null;
  tradeDescription         = '';
  city                     = '';
  phone                    = '';
  showContact              = true;

  // ── Lookup data ─────────────────────────────────────────────────────────
  readonly categories: string[]   = ['Electronics', 'Clothing', 'Books', 'Sports', 'Furniture', 'Other'];
  readonly conditions: Condition[] = ['New w/ Tags', 'Excellent', 'Good', 'Fair', 'For Parts'];

  // ── Step validation ─────────────────────────────────────────────────────
  get phase1Valid(): boolean {
    return (
      this.title.trim().length > 0 &&
      this.category !== '' &&
      this.selectedCondition !== '' &&
      this.imageSlots.some(s => s !== null)
    );
  }

  get phase2Valid(): boolean {
    const priceOk = this.pricingMode === 'trade' || (this.price !== null && this.price > 0);
    return priceOk && this.city.trim().length > 0;
  }

  get allValid(): boolean {
    return this.phase1Valid && this.phase2Valid;
  }

  canProceed(): boolean {
    if (this.currentStep() === 1) return this.phase1Valid;
    if (this.currentStep() === 2) return this.phase2Valid;
    return this.allValid;
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  nextStep() {
    if (this.currentStep() < this.totalSteps && this.canProceed()) {
      this.currentStep.set(this.currentStep() + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(n: number) {
    // Only allow going back or to validated steps
    if (n < this.currentStep()) {
      this.currentStep.set(n);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── Form helpers ─────────────────────────────────────────────────────────
  selectCondition(cond: Condition) { this.selectedCondition = cond; }
  setPricingMode(mode: PricingMode) { this.pricingMode = mode; }

  onImageSlotClick(index: number) {
    this.imageSlots = this.imageSlots.map((s, i) => i === index ? 'placeholder' : s);
  }

  removeImage(index: number, event: Event) {
    event.stopPropagation();
    this.imageSlots = this.imageSlots.map((s, i) => i === index ? null : s);
  }

  // ── Final actions ────────────────────────────────────────────────────────
  saveDraft() {
    alert('Draft saved!');
  }

  publish() {
    if (!this.allValid) return;
    alert('Listing published!');
    this.router.navigate(['/products']);
  }
}
