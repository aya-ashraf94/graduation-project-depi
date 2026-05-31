import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth';
import { ConfirmService } from '../../../../core/services/confirm.service';
import {
  Product,
  ProductCondition,
  ProductCategory,
  ProductStatus,
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
  private cdr = inject(ChangeDetectorRef);
  private confirmService = inject(ConfirmService);

  product: Product | null = null;
  isOwner = false;
  saving = signal(false);
  isLoading = true;

  // Editable fields
  title = '';
  description = '';
  price: number | null = null;
  category: ProductCategory | '' = '';
  condition: ProductCondition | '' = '';
  size = '';
  status: ProductStatus = 'available';

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

    const startTime = Date.now();
    this.isLoading = true;

    this.productService.getProductById(id).subscribe({
      next: (product) => {
        if (!product) {
          this.router.navigate(['/products']);
          return;
        }

        const elapsed = Date.now() - startTime;
        const delayTime = Math.max(0, 400 - elapsed);

        setTimeout(() => {
          this.product = product;
          const currentUser = this.authService.currentUser();
          this.isOwner = currentUser?.id === product.seller.id;

          if (!this.isOwner) {
            this.router.navigate(['/products', id]);
            return;
          }

          this.title = product.title;
          this.description = product.description;
          this.price = product.price;
          this.category = product.category;
          this.condition = product.condition;
          this.size = product.size || '';
          this.status = product.status;
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
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/products', this.product!.id]);
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Error updating:', err);
      }
    });
  }

  deleteListing(): void {
    if (!this.product) return;
    this.confirmService.show({
      title: 'Delete Listing',
      message: 'Are you sure you want to delete this listing? This cannot be undone.',
      onConfirm: () => {
        this.productService.deleteProduct(this.product!.id).subscribe(() => {
          this.router.navigate(['/profile/me']);
        });
      }
    });
  }

  cancel(): void {
    if (this.product) {
      this.router.navigate(['/products', this.product.id]);
    } else {
      this.router.navigate(['/products']);
    }
  }
}
