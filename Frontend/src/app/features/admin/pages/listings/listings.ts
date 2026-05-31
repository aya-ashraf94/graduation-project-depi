import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { Product } from '../../../../core/models/product.model';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';

@Component({
  selector: 'app-admin-listings',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './listings.html',
  styleUrl: './listings.css'
})
export class Listings implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  products = signal<Product[]>([]);
  totalProducts = signal(0);
  currentPage = signal(1);
  pageSize = 20;
  totalPages = signal(0);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  filterForm!: FormGroup;

  // Available categories in the system
  categoriesList = [
    { value: '', label: 'All Categories' },
    { value: 'outerwear', label: 'Outerwear' },
    { value: 'tops', label: 'Tops & Apparel' },
    { value: 'bottoms', label: 'Bottoms' },
    { value: 'footwear', label: 'Footwear' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'furniture', label: 'Furniture & Appliance' },
    { value: 'books', label: 'Books' },
    { value: 'sports', label: 'Sports' },
    { value: 'other', label: 'Other' }
  ];

  statusList = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active / Available' },
    { value: 'sold', label: 'Sold' },
    { value: 'draft', label: 'Draft' }
  ];

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      status: [''],
      category: ['']
    });

    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage.set(1);
      this.loadListings();
    });

    this.loadListings();
  }

  loadListings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filters = {
      status: this.filterForm.get('status')?.value || undefined,
      category: this.filterForm.get('category')?.value || undefined
    };

    this.adminService.getAllProducts(this.currentPage(), this.pageSize, filters).subscribe({
      next: (res) => {
        this.products.set(res.products);
        this.totalProducts.set(res.total);
        this.totalPages.set(res.pages);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching listings:', err);
        this.errorMessage.set('Failed to retrieve marketplace products.');
        this.isLoading.set(false);
      }
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadListings();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadListings();
    }
  }

  toggleVerify(product: Product): void {
    const nextVal = !product.isVerified;
    this.adminService.patchProduct(product.id, { isVerified: nextVal }).subscribe({
      next: (updatedProd) => {
        this.products.update(list => list.map(p => p.id === product.id ? { ...p, isVerified: updatedProd.isVerified } : p));
        this.toastService.success(`Product verification status toggled successfully.`);
      },
      error: (err) => {
        console.error('Failed to update product verification:', err);
        this.toastService.error('Failed to toggle product verification status.');
      }
    });
  }

  deleteProduct(product: Product): void {
    const msg = `Are you sure you want to permanently DELETE the listing "${product.title}"? This will physically delete the listing and any reports associated with it. This action cannot be undone.`;
    this.confirmService.show({
      title: 'Delete Listing',
      message: msg,
      onConfirm: () => {
        this.adminService.deleteProduct(product.id).subscribe({
          next: () => {
            this.toastService.success('Product listing deleted successfully.');
            this.loadListings();
          },
          error: (err) => {
            console.error('Failed to delete product:', err);
            this.toastService.error('Failed to delete product. Please try again.');
          }
        });
      }
    });
  }
}
