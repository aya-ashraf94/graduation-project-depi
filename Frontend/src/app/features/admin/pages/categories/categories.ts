import { Component, signal, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';

interface Category {
  id: string;
  name: string;
  discountPercent: number | null;
  saleStart: string | null;
  saleEnd: string | null;
  attributes: { id: string; name: string; type: string; options: string[]; required: boolean; hasOther: boolean }[];
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminErrorPanelComponent, AdminLoaderComponent],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCategories implements OnInit {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  categories = signal<Category[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  showModal = signal(false);
  editingCat = signal<Category | null>(null);
  saving = signal(false);

  formName = '';
  formAttributes: { name: string; type: string; options: string; required: boolean; hasOther: boolean }[] = [];

  private apiUrl = `${environment.apiUrl}/categories`;

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.http.get<Category[]>(this.apiUrl).subscribe({
      next: (list) => { this.categories.set(list); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load categories.'); this.isLoading.set(false); }
    });
  }

  openCreateModal(): void {
    this.editingCat.set(null);
    this.formName = '';
    this.formAttributes = [];
    this.showModal.set(true);
  }

  openEditModal(cat: Category): void {
    this.editingCat.set(cat);
    this.formName = cat.name;
    this.formAttributes = (cat.attributes || []).map(a => ({
      name: a.name,
      type: a.type,
      options: Array.isArray(a.options) ? a.options.join(', ') : '',
      required: a.required,
      hasOther: a.hasOther,
    }));
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingCat.set(null);
  }

  addAttribute(): void {
    this.formAttributes = [...this.formAttributes, { name: '', type: 'text', options: '', required: true, hasOther: false }];
  }

  removeAttribute(index: number): void {
    this.formAttributes = this.formAttributes.filter((_, i) => i !== index);
  }

  saveCategory(): void {
    if (!this.formName.trim()) {
      this.toastService.error('Category name is required.');
      return;
    }

    this.saving.set(true);
    const payload = {
      name: this.formName.trim(),
      attributes: this.formAttributes.map(a => ({
        name: a.name,
        type: a.type,
        options: a.type === 'select' || a.type === 'radio' ? a.options.split(',').map((o: string) => o.trim()).filter(Boolean) : [],
        required: a.required,
        hasOther: a.hasOther,
      })),
    };

    const obs = this.editingCat()
      ? this.http.put(`${this.apiUrl}/${this.editingCat()!.id}`, payload)
      : this.http.post(this.apiUrl, payload);

    obs.subscribe({
      next: () => {
        this.toastService.success(this.editingCat() ? 'Category updated!' : 'Category created!');
        this.saving.set(false);
        this.closeModal();
        this.loadCategories();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to save category.');
        this.saving.set(false);
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  deleteCategory(id: string, name: string): void {
    this.confirmService.show({
      title: 'Delete Category',
      message: `Delete "${name}" and all its attributes? This cannot be undone.`,
      onConfirm: () => {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe({
          next: () => {
            this.toastService.success(`Category "${name}" deleted.`);
            this.loadCategories();
          },
          error: (err) => this.toastService.error(err?.error?.message || 'Failed to delete category.')
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showModal.set(false);
  }
}
