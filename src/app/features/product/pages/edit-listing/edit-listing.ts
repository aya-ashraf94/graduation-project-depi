import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import {
  Product,
  ProductCondition,
  ProductCategory,
  CONDITION_LABELS,
  CATEGORY_LABELS,
} from '../../../../core/models/product.model';

@Component({
  selector: 'app-edit-listing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-listing.html',
  styleUrl: './edit-listing.css',
})
export class EditListing implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private authService = inject(AuthService);

  product: Product | null = null;
  isOwner = false;
  saving = signal(false);

  // Editable fields
  title = '';
  description = '';
  price: number | null = null;
  category: ProductCategory | '' = '';
  condition: ProductCondition | '' = '';
  size = '';
  status: 'available' | 'reserved' | 'sold' = 'available';

  // Lookup data
  readonly categoryLabels = CATEGORY_LABELS;
  readonly conditionLabels = CONDITION_LABELS;
  readonly categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];
  readonly conditions = Object.keys(CONDITION_LABELS) as ProductCondition[];
  readonly statuses = ['available', 'reserved', 'sold'] as const;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/products']);
      return;
    }

    const product = this.productService.getProductById(id);
    if (!product) {
      this.router.navigate(['/products']);
      return;
    }

    this.product = product;

    // Check ownership
    const currentUser = this.authService.currentUser();
    this.isOwner = currentUser?.id === product.seller.id;

    if (!this.isOwner) {
      this.router.navigate(['/products', id]);
      return;
    }

    // Populate form
    this.title = product.title;
    this.description = product.description;
    this.price = product.price;
    this.category = product.category;
    this.condition = product.condition;
    this.size = product.size || '';
    this.status = product.status;
  }

  get formValid(): boolean {
    return (
      this.title.trim().length > 0 &&
      this.description.trim().length > 0 &&
      this.price !== null &&
      this.price > 0 &&
      this.category !== '' &&
      this.condition !== ''
    );
  }

  /**
   * SAVE CHANGES
   * REAL: this.http.patch(`${environment.apiUrl}/products/${id}`, payload);
   */
  saveChanges(): void {
    if (!this.formValid || !this.product) return;

    this.saving.set(true);

    this.productService.updateProduct(this.product.id, {
      title: this.title,
      description: this.description,
      price: this.price!,
      category: this.category as ProductCategory,
      condition: this.condition as ProductCondition,
      size: this.size || undefined,
      status: this.status,
    });

    // Simulate brief save delay for UX
    setTimeout(() => {
      this.saving.set(false);
      this.router.navigate(['/products', this.product!.id]);
    }, 500);
  }

  /**
   * DELETE LISTING
   * REAL: this.http.delete(`${environment.apiUrl}/products/${id}`);
   */
  deleteListing(): void {
    if (!this.product) return;
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;

    this.productService.deleteProduct(this.product.id);
    this.router.navigate(['/profile/me']);
  }

  cancel(): void {
    if (this.product) {
      this.router.navigate(['/products', this.product.id]);
    } else {
      this.router.navigate(['/products']);
    }
  }
}
