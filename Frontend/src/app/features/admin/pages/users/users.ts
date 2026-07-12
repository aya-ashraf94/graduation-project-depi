import { Component, signal, inject, OnInit, computed, effect, DestroyRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdminService, AdminStats } from '../../../../core/services/admin.service';
import { User } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { PaginationService } from '../../../../shared/services/pagination.service';

import { UserAvatarComponent } from '../../../../shared/components/user-avatar/user-avatar';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { AdminErrorPanelComponent } from '../../../../shared/components/admin-error-panel/admin-error-panel';
import { AdminTableSkeletonComponent } from '../../../../shared/components/admin-table-skeleton/admin-table-skeleton';
import { AdminLoaderComponent } from '../../../../shared/components/admin-loader/admin-loader';
import { exportToCsv } from '../../../../shared/utils/csv-export.utils';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, UserAvatarComponent, PaginationComponent, EmptyStateComponent, AdminErrorPanelComponent, AdminTableSkeletonComponent, AdminLoaderComponent],
  templateUrl: './users.html',
  styleUrl: './users.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Users implements OnInit {
  private adminService = inject(AdminService);
  protected authService = inject(AuthService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private destroyRef = inject(DestroyRef);
  protected pagination = inject(PaginationService);

  users = signal<User[]>([]);
  totalUsers = signal(0);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  stats = signal<AdminStats | null>(null);
  activeDropdownUserId = signal<string | null>(null);

  searchControl = new FormControl('');
  roleControl = new FormControl('all');
  statusControl = new FormControl('all');
  verifiedControl = new FormControl('all');
  activeMetric = signal<string | null>(null);

  // Inline edit modal
  showEditModal = signal(false);
  editingUser = signal<User | null>(null);
  editFirstName = '';
  editLastName = '';
  editEmail = '';
  editPhone = '';
  editLocation = '';
  editBio = '';
  savingEdit = signal(false);

  openEditModal(user: User): void {
    this.editingUser.set(user);
    this.editFirstName = user.firstName;
    this.editLastName = user.lastName;
    this.editEmail = user.email;
    this.editPhone = user.phoneNumber || '';
    this.editLocation = user.location || '';
    this.editBio = user.bio || '';
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingUser.set(null);
  }

  saveEditUser(): void {
    const user = this.editingUser();
    if (!user) return;
    if (!this.editFirstName.trim() || !this.editEmail.trim()) {
      this.toastService.error('First name and email are required.');
      return;
    }

    this.savingEdit.set(true);
    this.adminService.patchUser(user.id, {
      name: `${this.editFirstName.trim()} ${this.editLastName.trim()}`,
      email: this.editEmail.trim(),
      phoneNumber: this.editPhone.trim(),
      location: this.editLocation.trim(),
      bio: this.editBio.trim(),
    } as any).subscribe({
      next: () => {
        this.toastService.success('User updated successfully.');
        this.savingEdit.set(false);
        this.closeEditModal();
        this.loadUsers();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to update user.');
        this.savingEdit.set(false);
      }
    });
  }

  toggleUserDropdown(userId: string, event: Event): void {
    event.stopPropagation();
    if (this.activeDropdownUserId() === userId) {
      this.activeDropdownUserId.set(null);
    } else {
      this.activeDropdownUserId.set(userId);
    }
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.activeDropdownUserId.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showEditModal.set(false);
  }

  ngOnInit(): void {
    // Setup search listener with debounce
    this.searchControl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.pagination.goToPage(1);
      this.loadUsers();
    });

    this.roleControl.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.pagination.goToPage(1);
      this.loadUsers();
    });

    this.statusControl.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.pagination.goToPage(1);
      this.loadUsers();
    });

    this.verifiedControl.valueChanges.subscribe(() => {
      this.pagination.goToPage(1);
      this.loadUsers();
    });

    this.loadStats();
    this.loadUsers();
  }

  loadStats(): void {
    this.adminService.getStats().subscribe({
      next: (res) => this.stats.set(res),
      error: () => {}
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const searchVal = this.searchControl.value || '';
    const roleVal = this.roleControl.value || 'all';
    const statusVal = this.statusControl.value || 'all';
    const verifiedVal = this.verifiedControl.value || 'all';

    this.adminService.getUsers(this.pagination.currentPage(), this.pagination.pageSize(), {
      search: searchVal,
      role: roleVal,
      status: statusVal,
      verified: verifiedVal !== 'all' ? verifiedVal : undefined
    }).subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.totalUsers.set(res.total);
        this.pagination.setResult(res.total, res.pages);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.errorMessage.set('Failed to fetch user accounts.');
        this.isLoading.set(false);
      }
    });
  }

  nextPage(): void {
    this.pagination.nextPage();
    this.loadUsers();
  }

  prevPage(): void {
    this.pagination.prevPage();
    this.loadUsers();
  }

  setMetricFilter(metric: string | null): void {
    this.activeMetric.set(metric);
    this.pagination.goToPage(1);
    switch (metric) {
      case 'total':
        this.roleControl.setValue('all', { emitEvent: false });
        this.statusControl.setValue('all', { emitEvent: false });
        this.verifiedControl.setValue('all', { emitEvent: false });
        break;
      case 'admins':
        this.roleControl.setValue('admin', { emitEvent: false });
        this.statusControl.setValue('all', { emitEvent: false });
        this.verifiedControl.setValue('all', { emitEvent: false });
        break;
      case 'verified':
        this.roleControl.setValue('all', { emitEvent: false });
        this.statusControl.setValue('all', { emitEvent: false });
        this.verifiedControl.setValue('true', { emitEvent: false });
        break;
      case 'suspended':
        this.roleControl.setValue('all', { emitEvent: false });
        this.statusControl.setValue('suspended', { emitEvent: false });
        this.verifiedControl.setValue('all', { emitEvent: false });
        break;
      default:
        this.roleControl.setValue('all', { emitEvent: false });
        this.statusControl.setValue('all', { emitEvent: false });
        this.verifiedControl.setValue('all', { emitEvent: false });
    }
    this.loadUsers();
  }

  toggleVerify(user: User): void {
    const nextVal = !user.isVerified;
    this.adminService.patchUser(user.id, { isVerified: nextVal }).subscribe({
      next: (updatedUser) => {
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, isVerified: updatedUser.isVerified } : u));
        this.toastService.success(`User verification status updated successfully.`);
        this.loadStats();
      },
      error: (err) => {
        console.error('Failed to update verification:', err);
        this.toastService.error('Failed to toggle verification. Please try again.');
      }
    });
  }

  toggleSuspend(user: User): void {
    const nextVal = !user.isSuspended;
    const msg = nextVal 
      ? `Are you sure you want to SUSPEND ${user.firstName} ${user.lastName}? They will be blocked from logging in.`
      : `Are you sure you want to UNSUSPEND ${user.firstName} ${user.lastName}?`;

    this.confirmService.show({
      title: nextVal ? 'Suspend Account' : 'Activate Account',
      message: msg,
      onConfirm: () => {
        this.adminService.patchUser(user.id, { isSuspended: nextVal }).subscribe({
          next: (updatedUser) => {
            this.users.update(list => list.map(u => u.id === user.id ? { ...u, isSuspended: updatedUser.isSuspended } : u));
            this.toastService.success(updatedUser.isSuspended ? 'User account suspended.' : 'User account activated.');
            this.loadStats();
          },
          error: (err) => {
            console.error('Failed to update suspension:', err);
            this.toastService.error('Failed to toggle suspension. Please try again.');
          }
        });
      }
    });
  }

  toggleRole(user: User): void {
    if (user.id === this.authService.currentUser()?.id) {
      this.toastService.error('You cannot change your own role.');
      return;
    }
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const msg = `Are you sure you want to change role of ${user.firstName} ${user.lastName} to ${nextRole.toUpperCase()}?`;
    
    this.confirmService.show({
      title: 'Change User Role',
      message: msg,
      onConfirm: () => {
        this.adminService.patchUser(user.id, { role: nextRole }).subscribe({
          next: (updatedUser) => {
            this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: updatedUser.role } : u));
            this.toastService.success(`User role changed to ${updatedUser.role.toUpperCase()}.`);
            this.loadStats();
          },
          error: (err) => {
            console.error('Failed to update role:', err);
            this.toastService.error('Failed to toggle role. Please try again.');
          }
        });
      }
    });
  }

  exportCsv(): void {
    const headers = ['Name', 'Email', 'Role', 'Verified', 'Suspended', 'Joined'];
    const data = this.users().map(u => [
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.role,
      u.isVerified ? 'Yes' : 'No',
      u.isSuspended ? 'Yes' : 'No',
      u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '',
    ]);
    exportToCsv('users', [headers, ...data]);
  }

  deleteUser(user: User): void {
    if (user.id === this.authService.currentUser()?.id) {
      this.toastService.error('You cannot delete your own active admin account.');
      return;
    }

    const msg = `⚠️ WARNING: This will permanently DELETE the user account "${user.firstName} ${user.lastName}" and ALL their marketplace listings. This action CANNOT be undone. Proceed?`;
    this.confirmService.show({
      title: 'Delete User Account',
      message: msg,
      onConfirm: () => {
        this.adminService.deleteUser(user.id).subscribe({
          next: () => {
            this.toastService.success('User account deleted successfully.');
            this.loadStats();
            this.loadUsers();
          },
          error: (err) => {
            console.error('Failed to delete user:', err);
            this.toastService.error('Failed to delete user account. Please try again.');
          }
        });
      }
    });
  }
}
