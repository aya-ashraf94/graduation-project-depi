import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  Product,
  ProductStatus,
} from '../../../../core/models/product.model';

@Component({
  selector: 'app-edit-listing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './edit-listing.html',
  styleUrl: './edit-listing.css',
})
export class EditListing implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private confirmService = inject(ConfirmService);
  private toastService = inject(ToastService);

  product: Product | null = null;
  isOwner = false;
  saving = signal(false);
  isLoading = true;
  formError = signal<string | null>(null);

  images: string[] = [];

  categories: any[] = [];
  readonly statuses: ProductStatus[] = ['available', 'reserved', 'sold'];

  form: FormGroup;

  selectedCategory = signal<any>(null);
  dynamicFields: any = {};

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      categoryId: ['', Validators.required],
      status: ['available', Validators.required],
      location: [''],
      phoneNumber: [''],
      showContactInfo: [true],
    });
  }

  get f() { return this.form.controls; }

  fieldError(fieldName: string): string | null {
    const control = this.form.get(fieldName);
    if (!control || !control.invalid) return null;
    if (control.errors?.['required']) return 'This field is required';
    if (control.errors?.['minlength']) return `Minimum ${control.errors?.['minlength'].requiredLength} characters`;
    if (control.errors?.['min']) return `Must be at least ${control.errors?.['min'].min}`;
    if (control.errors?.['max']) return `Must be at most ${control.errors?.['max'].max}`;
    return 'Invalid value';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/products']); return; }

    this.productService.getCategories().subscribe({
      next: (res) => {
        this.categories = res;
        this.trySelectCategory();
        this.cdr.detectChanges();
      }
    });

    const startTime = Date.now();
    this.isLoading = true;

    this.productService.getProductById(id).subscribe({
      next: (product) => {
        if (!product) { this.router.navigate(['/products']); return; }

        const elapsed = Date.now() - startTime;
        const delayTime = Math.max(0, 400 - elapsed);

        setTimeout(() => {
          this.product = product;

          const catId = (product.categoryId as any)?._id || product.categoryId || '';

          const currentUser = this.authService.currentUser();
          this.isOwner = currentUser?.id === product.seller.id;
          if (!this.isOwner) { this.router.navigate(['/products', id]); return; }

          this.images = [...product.images];

          this.form.patchValue({
            title: product.title,
            description: product.description,
            price: product.price,
            categoryId: catId,
            status: product.status,
            location: product.location || '',
            phoneNumber: product.phoneNumber || '',
            showContactInfo: product.showContactInfo ?? true,
          });

          this.trySelectCategory();
          this.isLoading = false;
          this.cdr.detectChanges();
        }, delayTime);
      },
      error: () => {
        const elapsed = Date.now() - startTime;
        const delayTime = Math.max(0, 400 - elapsed);
        setTimeout(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
          this.router.navigate(['/products']);
        }, delayTime);
      }
    });
  }

  private trySelectCategory(): void {
    const catId = this.form.get('categoryId')?.value;
    if (!catId || !this.categories.length) return;
    const cat = this.categories.find((c: any) => c.id === catId);
    if (!cat) return;
    this.selectedCategory.set(cat);
    this.populateDynamicFields();
  }

  private populateDynamicFields(): void {
    const cat = this.selectedCategory();
    if (!cat || !this.product) return;
    const raw = this.product.rawDynamicAttributes || {};

    const rawByLower: Record<string, string> = {};
    for (const key of Object.keys(raw)) {
      rawByLower[key.toLowerCase()] = key;
    }

    for (const attr of cat.attributes || []) {
      const name = attr.name;
      const originalKey = rawByLower[name.toLowerCase()];
      if (originalKey) {
        this.dynamicFields[name] = raw[originalKey];
      }
    }
  }

  syncDynamicField(name: string, value: any): void {
    this.dynamicFields[name] = value;
  }

  onCategoryChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.form.patchValue({ categoryId: id });
    const cat = this.categories.find(c => c.id === id);
    this.selectedCategory.set(cat || null);
    this.dynamicFields = {};
    if (this.product && cat) {
      this.populateDynamicFields();
    }
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => { this.images.push(reader.result as string); };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number): void {
    this.images.splice(index, 1);
  }

  saveChanges(): void {
    this.formError.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.product) return;
    if (this.images.length === 0) { this.formError.set('At least one image is required'); return; }

    this.saving.set(true);
    const v = this.form.value;

    const dynamicAttributes: any = {};
    for (const key of Object.keys(this.dynamicFields)) {
      if (!key.endsWith('_other') && this.dynamicFields[key] !== undefined && this.dynamicFields[key] !== null && this.dynamicFields[key] !== '') {
        dynamicAttributes[key] = this.dynamicFields[key];
      }
    }

    this.productService.updateProduct(this.product.id, {
      title: v.title,
      description: v.description,
      price: v.price,
      categoryId: v.categoryId,
      dynamicAttributes,
      status: v.status as ProductStatus,
      images: this.images,
      location: v.location,
      phoneNumber: v.phoneNumber,
      showContactInfo: v.showContactInfo,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.success('Listing updated successfully!');
        this.router.navigate(['/products', this.product!.id]);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message || err?.message || 'Failed to update listing. Please try again.';
        this.formError.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  deleteListing(): void {
    if (!this.product) return;
    this.confirmService.show({
      title: 'Delete Listing',
      message: 'Are you sure you want to delete this listing? This cannot be undone.',
      onConfirm: () => {
        this.productService.deleteProduct(this.product!.id).subscribe({
          next: () => {
            this.toastService.success('Listing deleted');
            this.router.navigate(['/profile/me']);
          },
          error: (err) => {
            this.toastService.error(err?.error?.message || 'Failed to delete listing');
          }
        });
      }
    });
  }

  cancel(): void {
    if (this.product) this.router.navigate(['/products', this.product.id]);
    else this.router.navigate(['/products']);
  }
}
