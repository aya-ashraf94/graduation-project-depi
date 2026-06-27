import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  manualToken = '';
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal(false);

  sendForgot() {
    if (!this.email.trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.auth.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'If your email is registered, we have sent a secure link.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to request reset.');
      }
    });
  }

  verifyAndOpenReset() {
    if (!this.manualToken.trim()) return;
    
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.auth.validateResetToken(this.manualToken).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/auth/reset-password'], { queryParams: { token: this.manualToken } });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Invalid or expired password reset token');
      }
    });
  }
}
