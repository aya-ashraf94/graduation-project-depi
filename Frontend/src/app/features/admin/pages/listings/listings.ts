import { Component, signal, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { AdminService, AdminStats } from '../../../../core/services/admin.service';
import { ProductService } from '../../../../core/services/product.service';
import { Product } from '../../../../core/models/product.model';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { getConditionLabel, getConditionClass } from '../../../../shared/utils/condition.utils';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminTableSkeletonComponent } from '../../../../shared/components/admin-table-skeleton/admin-table-skeleton';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-admin-listings',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, PaginationComponent, EmptyStateComponent, AdminErrorPanelComponent, AdminTableSkeletonComponent, StatusBadgeComponent, AdminLoaderComponent],
  templateUrl: './listings.html',
  styleUrl: './listings.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Listings implements OnInit {
  private adminService = inject(AdminService);
  private productService = inject(ProductService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private route = inject(ActivatedRoute);
  protected pagination = inject(PaginationService);

  // Inline edit modal
  showEditModal = signal(false);
  editingProduct = signal<Product | null>(null);
  editTitle = '';
  editDescription = '';
  editPrice = 0;
  editMinPrice = 0;
  editCategoryId = '';
  editStatus = '';
  savingEdit = signal(false);
  categoriesForEdit: { id: string; name: string }[] = [];
  readonly editStatusOptions = ['active', 'reserved', 'sold', 'draft'];

  products = signal<Product[]>([]);
  totalProducts = signal(0);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  stats = signal<AdminStats | null>(null);
  activeDropdownProductId = signal<string | null>(null);

  filterForm!: FormGroup;
  searchControl = new FormControl('');
  activeMetric = signal<string | null>(null);
  activeVerified = signal<string | null>(null);

  categoriesList: { value: string; label: string }[] = [{ value: '', label: 'All Categories' }];

  statusList = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Available' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'sold', label: 'Sold' },
    { value: 'draft', label: 'Draft' }
  ];

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      status: [''],
      category: ['']
    });

    this.filterForm.valueChanges.subscribe(() => {
      this.pagination.goToPage(1);
      this.loadListings();
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pagination.goToPage(1);
      this.loadListings();
    });

    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.filterForm.patchValue({ status: params['status'] }, { emitEvent: false });
      }
      if (params['verified']) {
        this.activeVerified.set(params['verified']);
      }
    });

    this.productService.getCategories().subscribe({
      next: (cats) => {
        this.categoriesList = [
          { value: '', label: 'All Categories' },
          ...cats.map((c: any) => ({ value: c.name, label: c.name }))
        ];
      },
      error: () => {
        this.categoriesList = [{ value: '', label: 'All Categories' }];
      }
    });

    this.loadStats();
    this.loadListings();
  }

  loadStats(): void {
    this.adminService.getStats().subscribe({
      next: (res) => this.stats.set(res),
      error: () => {}
    });
  }

  toggleProductDropdown(productId: string, event: Event): void {
    event.stopPropagation();
    if (this.activeDropdownProductId() === productId) {
      this.activeDropdownProductId.set(null);
    } else {
      this.activeDropdownProductId.set(productId);
    }
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.activeDropdownProductId.set(null);
  }

  setMetricFilter(metric: string | null): void {
    this.activeMetric.set(metric);
    this.activeVerified.set(null);
    this.pagination.goToPage(1);
    switch (metric) {
      case 'total':
        this.filterForm.patchValue({ status: '', category: '' }, { emitEvent: false });
        break;
      case 'active':
        this.filterForm.patchValue({ status: 'active', category: '' }, { emitEvent: false });
        break;
      case 'sold':
        this.filterForm.patchValue({ status: 'sold', category: '' }, { emitEvent: false });
        break;
      default:
        this.filterForm.patchValue({ status: '', category: '' }, { emitEvent: false });
    }
    this.loadListings();
  }

  loadListings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filters: any = {
      status: this.filterForm.get('status')?.value || undefined,
      category: this.filterForm.get('category')?.value || undefined,
      search: this.searchControl.value || undefined,
      verified: this.activeVerified() || undefined
    };

    this.adminService.getAllProducts(this.pagination.currentPage(), this.pagination.pageSize(), filters).subscribe({
      next: (res) => {
        this.products.set(res.products);
        this.totalProducts.set(res.total);
        this.pagination.setResult(res.total, res.pages);
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
    this.pagination.nextPage();
    this.loadListings();
  }

  prevPage(): void {
    this.pagination.prevPage();
    this.loadListings();
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.editTitle = product.title;
    this.editDescription = product.description;
    this.editPrice = product.price;
    this.editMinPrice = product.minPrice || 0;
    this.editCategoryId = product.categoryId || '';
    this.editStatus = product.status;
    this.showEditModal.set(true);

    if (this.categoriesForEdit.length === 0) {
      this.productService.getCategories().subscribe({
        next: (cats) => this.categoriesForEdit = cats.map((c: any) => ({ id: c.id, name: c.name })),
        error: () => {}
      });
    }
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingProduct.set(null);
  }

  saveEdit(): void {
    const prod = this.editingProduct();
    if (!prod) return;
    if (!this.editTitle.trim()) {
      this.toastService.error('Title is required.');
      return;
    }

    this.savingEdit.set(true);
    const payload: any = {
      title: this.editTitle.trim(),
      description: this.editDescription,
      price: this.editPrice,
      minPrice: this.editMinPrice > 0 ? this.editMinPrice : null,
      categoryId: this.editCategoryId || null,
      status: this.editStatus,
    };

    this.http.put(`${environment.apiUrl}/products/${prod.id}`, payload).subscribe({
      next: () => {
        this.toastService.success('Product updated successfully.');
        this.savingEdit.set(false);
        this.closeEditModal();
        this.loadListings();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to update product.');
        this.savingEdit.set(false);
      }
    });
  }

  getConditionLabel(condition: string): string {
    return getConditionLabel(condition);
  }

  getConditionClass(condition: string): string {
    return getConditionClass(condition);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      available: 'Available',
      reserved: 'Reserved',
      sold: 'Sold',
      draft: 'Draft'
    };
    return labels[status] || status;
  }

  toggleVerify(product: Product): void {
    const nextVal = !product.isVerified;
    this.adminService.patchProduct(product.id, { isVerified: nextVal }).subscribe({
      next: (updatedProd) => {
        this.products.update(list => list.map(p => p.id === product.id ? { ...p, isVerified: updatedProd.isVerified } : p));
        this.toastService.success(`Product verification status toggled successfully.`);
        this.loadStats();
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
            this.loadStats();
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
