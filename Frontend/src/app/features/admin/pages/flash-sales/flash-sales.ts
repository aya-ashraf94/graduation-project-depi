import { Component, signal, inject, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlashSaleService } from '../../../../core/services/flash-sale.service';
import { FlashSale } from '../../../../core/models/flash-sale.model';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { ProductService } from '../../../../core/services/product.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-admin-flash-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminErrorPanelComponent, AdminLoaderComponent, EmptyStateComponent],
  templateUrl: './flash-sales.html',
  styleUrl: './flash-sales.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFlashSales implements OnInit {
  private flashSaleService = inject(FlashSaleService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private productService = inject(ProductService);

  sales = signal<FlashSale[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  isSubmitting = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  categories = signal<any[]>([]);
  products = signal<any[]>([]);
  today = new Date();

  startDateVal = '';
  startTimeVal = '';
  endDateVal = '';
  endTimeVal = '';

  searchQuery = signal('');
  statusFilter = signal<'all' | 'live' | 'upcoming' | 'expired'>('all');
  isScopeDropdownOpen = signal(false);
  showGuide = signal(false);

  totalCount = computed(() => this.sales().length);
  liveCount = computed(() => this.sales().filter(s => this.isLive(s)).length);
  upcomingCount = computed(() => this.sales().filter(s => this.isUpcoming(s)).length);
  expiredCount = computed(() => this.sales().filter(s => this.isExpired(s)).length);

  filteredSalesList = computed(() => {
    const list = this.sales();
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();

    return list.filter(sale => {
      const matchesQuery = sale.name.toLowerCase().includes(query);
      const isExp = this.isExpired(sale);
      const isLiveSale = this.isLive(sale);
      const isUp = this.isUpcoming(sale);

      if (filter === 'live') {
        return matchesQuery && isLiveSale;
      } else if (filter === 'upcoming') {
        return matchesQuery && isUp;
      } else if (filter === 'expired') {
        return matchesQuery && isExp;
      }
      return matchesQuery;
    });
  });

  formModel = {
    name: '',
    discountPercent: 20,
    scopeType: 'all' as 'all' | 'category' | 'product',
    scopeId: '',
    startDate: '',
    endDate: '',
    notifyBeforeMinutes: 30,
  };

  ngOnInit(): void {
    this.loadSales();
    this.productService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => {},
    });
  }

  loadSales(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.flashSaleService.getAllFlashSales().subscribe({
      next: (data) => {
        this.sales.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading flash sales:', err);
        this.errorMessage.set('Failed to load flash sales.');
        this.isLoading.set(false);
      },
    });
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.formModel = {
      name: '',
      discountPercent: 20,
      scopeType: 'all',
      scopeId: '',
      startDate: '',
      endDate: '',
      notifyBeforeMinutes: 30,
    };
    this.startDateVal = '';
    this.startTimeVal = '00:00';
    this.endDateVal = '';
    this.endTimeVal = '23:59';
    this.showForm.set(true);
  }

  openEditForm(sale: FlashSale): void {
    this.editingId.set(sale.id);
    this.formModel = {
      name: sale.name,
      discountPercent: sale.discountPercent,
      scopeType: sale.scopeType,
      scopeId: sale.scopeId || '',
      startDate: this.formatDateForInput(sale.startDate),
      endDate: this.formatDateForInput(sale.endDate),
      notifyBeforeMinutes: sale.notifyBeforeMinutes,
    };

    const startDt = new Date(sale.startDate);
    this.startDateVal = this.formatJustDate(startDt);
    this.startTimeVal = this.formatJustTime(startDt);

    const endDt = new Date(sale.endDate);
    this.endDateVal = this.formatJustDate(endDt);
    this.endTimeVal = this.formatJustTime(endDt);

    this.showForm.set(true);

    if (sale.scopeType === 'product' && sale.scopeId) {
      this.productService.getProductById(sale.scopeId).subscribe({
        next: (p) => this.products.set([p]),
        error: () => {},
      });
    }
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  submitForm(): void {
    const m = this.formModel;
    if (!m.name || !m.discountPercent || !this.startDateVal || !this.startTimeVal || !this.endDateVal || !this.endTimeVal) {
      this.toastService.error('Please fill all required fields.');
      return;
    }
    m.startDate = `${this.startDateVal}T${this.startTimeVal}`;
    m.endDate = `${this.endDateVal}T${this.endTimeVal}`;

    if (m.discountPercent < 1 || m.discountPercent > 100) {
      this.toastService.error('Discount must be between 1-100.');
      return;
    }
    if (new Date(m.endDate) <= new Date(m.startDate)) {
      this.toastService.error('End date must be after start date.');
      return;
    }

    const payload = {
      name: m.name,
      discountPercent: m.discountPercent,
      scopeType: m.scopeType,
      scopeId: m.scopeType !== 'all' ? m.scopeId || null : null,
      startDate: new Date(m.startDate).toISOString(),
      endDate: new Date(m.endDate).toISOString(),
      notifyBeforeMinutes: m.notifyBeforeMinutes,
    };

    this.isSubmitting.set(true);
    const request = this.editingId()
      ? this.flashSaleService.updateFlashSale(this.editingId()!, payload)
      : this.flashSaleService.createFlashSale(payload);

    request.subscribe({
      next: () => {
        this.toastService.success(this.editingId() ? 'Flash sale updated.' : 'Flash sale created.');
        this.isSubmitting.set(false);
        this.cancelForm();
        this.loadSales();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Operation failed.');
        this.isSubmitting.set(false);
      },
    });
  }

  toggleActive(sale: FlashSale): void {
    this.flashSaleService.updateFlashSale(sale.id, { isActive: !sale.isActive }).subscribe({
      next: () => {
        this.toastService.success(`Flash sale ${sale.isActive ? 'deactivated' : 'activated'}.`);
        this.loadSales();
      },
      error: () => this.toastService.error('Failed to update status.'),
    });
  }

  deleteSale(sale: FlashSale): void {
    this.confirmService.show({
      title: 'Delete Flash Sale',
      message: `Delete "${sale.name}"? This cannot be undone.`,
      onConfirm: () => {
        this.flashSaleService.deleteFlashSale(sale.id).subscribe({
          next: () => {
            this.toastService.success('Flash sale deleted.');
            this.loadSales();
          },
          error: () => this.toastService.error('Failed to delete.'),
        });
      },
    });
  }

  isExpired(sale: FlashSale): boolean {
    return new Date(sale.endDate) < this.today;
  }

  isUpcoming(sale: FlashSale): boolean {
    return new Date(sale.startDate) > this.today;
  }

  isLive(sale: FlashSale): boolean {
    return sale.isActive && new Date(sale.startDate) <= this.today && new Date(sale.endDate) >= this.today;
  }

  getSaleStatus(sale: FlashSale): string {
    if (!sale.isActive) return 'Disabled';
    if (this.isExpired(sale)) return 'Expired';
    if (this.isUpcoming(sale)) return 'Scheduled';
    return 'Live';
  }

  private formatDateForInput(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  }

  private formatJustDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatJustTime(d: Date): string {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  toggleScopeDropdown(): void {
    this.isScopeDropdownOpen.update(v => !v);
  }

  selectScopeType(type: 'all' | 'category' | 'product'): void {
    this.formModel.scopeType = type;
    this.onScopeTypeChange();
    this.isScopeDropdownOpen.set(false);
  }

  onScopeTypeChange(): void {
    this.formModel.scopeId = '';
    this.products.set([]);
  }

  searchProducts(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    if (term.length < 2) return;
    this.productService.getProducts({ search: term, limit: 10 }).subscribe({
      next: (prods) => this.products.set(prods),
      error: () => {},
    });
  }
}
