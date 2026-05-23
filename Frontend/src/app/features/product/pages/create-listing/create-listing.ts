import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth';

export type PricingMode = 'fixed' | 'trade';

@Component({
  selector: 'app-create-listing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-listing.html',
  styleUrl: './create-listing.css',
})
export class CreateListing implements OnInit {
  // ── Wizard State ────────────────────────────────────────────────────────
  currentStep = signal(1);
  readonly totalSteps = 3;

  readonly steps = [
    { num: 1, label: 'ITEM DETAILS', sub: 'What are you selling?' },
    { num: 2, label: 'PRICING', sub: 'Name your price & location' },
    { num: 3, label: 'CONFIRM', sub: 'Review & publish' },
  ];

  // ── Form Data ─────────────────────────────────────────────────────────────
  title = '';
  description = '';
  imageSlots: (string | null)[] = [null, null, null];

  // ── Dynamic & Category Data ──────────────────────────────────────────────
  allCategories = signal<any[]>([]);
  selectedCategory = signal<any>(null);
  dynamicFields: any = {};

  // ── Pricing & Contact Data ───────────────────────────────────────────────
  pricingMode: PricingMode = 'fixed';
  price: number | null = null;
  tradeDescription = '';
  city = '';
  phone = '';
  showContact = true;

  constructor(
    private router: Router,
    private http: HttpClient,
    public authService: AuthService // تأكدي من جعلها public لتستطيعي الوصول لها في الـ html إذا احتجتِ
  ) { }

  ngOnInit() {
    this.fetchCategories();
  }


  // ── Step validation ─────────────────────────────────────────────────────
  get phase1Valid(): boolean {
    // التأكد من اختيار كاتيجوري
    const hasCategory = this.selectedCategory() !== null;
    // التأكد من ملء كل الخصائص الديناميكية المطلوبة
    const hasDynamicFields = this.selectedCategory()?.attributes.every((attr: any) =>
      this.dynamicFields[attr.name] !== undefined && this.dynamicFields[attr.name] !== ''
    ) ?? true;

    return (
      this.title.trim().length > 0 &&
      hasCategory &&
      hasDynamicFields &&
      this.imageSlots.some(s => s !== null)
    );
  }

  get phase2Valid(): boolean {
    // السعر مطلوب في حالة الـ fixed فقط
    const priceOk = this.pricingMode === 'trade' || (this.price !== null && this.price > 0);
    return priceOk && this.city.trim().length > 0 && this.phone.trim().length > 0;
  }

  get allValid(): boolean {
    return this.phase1Valid && this.phase2Valid;
  }

  canProceed(): boolean {
    if (this.currentStep() === 1) return this.phase1Valid;
    if (this.currentStep() === 2) return this.phase2Valid;
    return this.allValid;
  }

  // ── Navigation & Helpers ─────────────────────────────────────────────────
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
    
    if (n < this.currentStep()) {
      this.currentStep.set(n);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onCategoryChange(event: Event) {
    const id = (event.target as HTMLSelectElement).value;
    const cat = this.allCategories().find(c => c._id === id);
    this.selectedCategory.set(cat);
    this.dynamicFields = {}; // Reset الـ fields عند تغيير الكاتيجوري
  }

  setPricingMode(mode: PricingMode) { this.pricingMode = mode; }

  onImageSlotClick(index: number) {
    this.imageSlots = this.imageSlots.map((s, i) => i === index ? 'placeholder' : s);
  }

  removeImage(index: number, event: Event) {
    event.stopPropagation();
    this.imageSlots = this.imageSlots.map((s, i) => i === index ? null : s);
  }

  // ── API Actions ────────────────────────────────────────────────────────
  fetchCategories() {
    this.http.get<any[]>('http://localhost:3000/api/categories').subscribe({
      next: (data) => this.allCategories.set(data),
      error: (err) => console.error('Error fetching categories:', err)
    });
  }

  publish() {
    if (!this.allValid) return;

    // جلب المستخدم الحالي من السيرفيس
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      alert('Please login to publish a listing.');
      return;
    }

    const finalPayload = {
      title: this.title,
      description: this.description,
      price: this.pricingMode === 'trade' ? 0 : this.price,
      categoryId: this.selectedCategory()?._id,
      dynamicAttributes: this.dynamicFields, // شامل كل الخصائص (الحالة، النوع، إلخ)
      images: this.imageSlots.filter(img => img !== null),
      location: this.city,
      phoneNumber: this.phone,
      showContactInfo: this.showContact,
      userId: currentUser.id
    };

    this.http.post('http://localhost:3000/api/products', finalPayload).subscribe({
      next: () => {
        alert('Listing published successfully!');
        this.router.navigate(['/products']);
      },
      error: (err) => {
        console.error('Error publishing:', err);
        alert('Failed to publish. Check console.');
      }
    });
  }

  saveDraft() { alert('Draft saved!'); }
}