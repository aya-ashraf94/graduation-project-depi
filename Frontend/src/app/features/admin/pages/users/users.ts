import { Component, signal, inject, OnInit, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdminService } from '../../../../core/services/admin.service';
import { User } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {
  private adminService = inject(AdminService);
  protected authService = inject(AuthService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  users = signal<User[]>([]);
  totalUsers = signal(0);
  currentPage = signal(1);
  pageSize = 20;
  totalPages = signal(0);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  searchControl = new FormControl('');

  ngOnInit(): void {
    // Setup search listener with debounce
    this.searchControl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage.set(1);
      this.loadUsers();
    });

    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const searchVal = this.searchControl.value || '';

    this.adminService.getUsers(this.currentPage(), this.pageSize, searchVal).subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.totalUsers.set(res.total);
        this.totalPages.set(res.pages);
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
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadUsers();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadUsers();
    }
  }

  toggleVerify(user: User): void {
    const nextVal = !user.isVerified;
    this.adminService.patchUser(user.id, { isVerified: nextVal }).subscribe({
      next: (updatedUser) => {
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, isVerified: updatedUser.isVerified } : u));
        this.toastService.success(`User verification status updated successfully.`);
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
          },
          error: (err) => {
            console.error('Failed to update role:', err);
            this.toastService.error('Failed to toggle role. Please try again.');
          }
        });
      }
    });
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
