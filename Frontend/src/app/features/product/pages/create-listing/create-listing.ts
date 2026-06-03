import { Component, OnInit, signal, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast.service';

export type PricingMode = 'fixed' | 'trade';

@Component({
  selector: 'app-create-listing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-listing.html',
  styleUrl: './create-listing.css',
})
export class CreateListing implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  activeSlotIndex = 0;

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
  imageSlots = signal<(string | null)[]>([null, null, null, null]);
  showMaxImageWarning = signal(false);

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

  private router = inject(Router);
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);

  ngOnInit() {
    this.fetchCategories();
  }


  // ── Step validation ─────────────────────────────────────────────────────
  // get missingPhase1Fields(): string[] {
  //   const missing: string[] = [];
  //   if (!this.title.trim()) {
  //     missing.push('Title');
  //   }
  //   if (!this.selectedCategory()) {
  //     missing.push('Category');
  //   } else {
  //     const attrs = this.selectedCategory().attributes || [];
  //     for (const attr of attrs) {
  //       if (attr.required !== false) {
  //         const val = this.dynamicFields[attr.name];
  //         if (val === undefined || val === '') {
  //           missing.push(attr.name);
  //         }
  //       }
  //     }
  //   }
  //   if (!this.imageSlots().some(s => s !== null)) {
  //     missing.push('At least one photo');
  //   }
  //   return missing;
  // }

  get missingPhase1Fields(): string[] {
    const missing: string[] = [];

    console.log(
      'dynamicFields = ',
      JSON.stringify(this.dynamicFields, null, 2)
    );

    if (!this.selectedCategory()) {
      missing.push('Category');
    } else {
      const attrs = this.selectedCategory().attributes || [];

      for (const attr of attrs) {
        console.log('attr = ', attr.name);
        console.log('value = ', this.dynamicFields[attr.name]);

        if (attr.required !== false) {
          const val = this.dynamicFields[attr.name];

          if (val === undefined || val === '') {
            missing.push(attr.name);
          }
        }
      }
    }
        if (!this.imageSlots().some(s => s !== null)) {
      missing.push('At least one photo');
    }
    return missing;
  }
  
  get phase1Valid(): boolean {
    return this.missingPhase1Fields.length === 0;
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

  triggerFileInput(index: number) {
    this.activeSlotIndex = index;
    this.fileInput.nativeElement.click();
  }

  triggerDropzoneInput() {
    const firstEmptyIndex = this.imageSlots().findIndex(s => s === null);
    this.activeSlotIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 0;
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);

      // Limit check: maximum of 4 images total
      const currentFilledCount = this.imageSlots().filter(s => s !== null).length;
      if (files.length > 4 || files.length + currentFilledCount > 4) {
        this.showMaxImageWarning.set(true);
        input.value = '';
        this.cdr.detectChanges();
        return;
      }

      let slotIndex = this.activeSlotIndex;
      let fileIndex = 0;

      const readNextFile = () => {
        if (fileIndex >= files.length || slotIndex >= this.imageSlots().length) {
          input.value = '';
          this.cdr.detectChanges();
          return;
        }

        const file = files[fileIndex];
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;

          // Find next empty slot if we're dealing with multiple files
          while (slotIndex < this.imageSlots().length && this.imageSlots()[slotIndex] !== null && fileIndex > 0) {
            slotIndex++;
          }

          if (slotIndex < this.imageSlots().length) {
            const currentSlots = [...this.imageSlots()];
            currentSlots[slotIndex] = base64String;
            this.imageSlots.set(currentSlots);
            slotIndex++;
            this.cdr.detectChanges();
          }

          fileIndex++;
          readNextFile();
        };
        reader.readAsDataURL(file);
      };

      readNextFile();
    }
  }

  removeImage(index: number, event: Event) {
    event.stopPropagation();
    const currentSlots = [...this.imageSlots()];
    currentSlots[index] = null;
    this.imageSlots.set(currentSlots);
    this.cdr.detectChanges();
  }

  // ── API Actions ────────────────────────────────────────────────────────
  fetchCategories() {
    this.http.get<any[]>(`${environment.apiUrl}/categories`).subscribe({
      next: (data) => this.allCategories.set(data),
      error: (err) => console.error('Error fetching categories:', err)
    });
  }

  publish() {
    if (!this.allValid) return;

    // جلب المستخدم الحالي من السيرفيس
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      this.toastService.error('Please login to publish a listing.');
      return;
    }

    const finalPayload = {
      title: this.title,
      description: this.description,
      price: this.pricingMode === 'trade' ? 0 : this.price,
      categoryId: this.selectedCategory()?._id,
      dynamicAttributes: this.dynamicFields, // شامل كل الخصائص (الحالة، النوع، إلخ)
      images: this.imageSlots().filter(img => img !== null),
      location: this.city,
      phoneNumber: this.phone,
      showContactInfo: this.showContact,
      userId: currentUser.id
    };

    this.http.post(`${environment.apiUrl}/products`, finalPayload).subscribe({
      next: () => {
        this.toastService.success('Listing published successfully!');
        this.router.navigate(['/products']);
      },
      error: (err) => {
        console.error('Error publishing:', err);
        this.toastService.error('Failed to publish product listing.');
      }
    });
  }

  saveDraft() { this.toastService.info('Draft saved successfully!'); }
}