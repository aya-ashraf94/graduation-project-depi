import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { LoginRequest } from '../../../../core/models/user.model';
import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  form: LoginRequest = { email: '', password: '' };
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  // Forgot password signals
  showForgotModal = signal(false);
  forgotEmail = '';
  forgotMessage = signal<string | null>(null);
  forgotError = signal<string | null>(null);
  forgotLoading = signal(false);
  receivedToken = signal<string>('');
  manualToken = '';

  // Reset password signals
  showResetModal = signal(false);
  resetTokenInput = '';
  resetPasswordInput = '';
  resetPasswordConfirm = '';
  resetSuccess = signal<string | null>(null);
  resetError = signal<string | null>(null);
  resetLoading = signal(false);

  signIn() {
    if (!this.form.email || !this.form.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.auth.login(this.form).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Invalid email or password');
      }
    });
  }

  openForgotModal() {
    this.forgotEmail = '';
    this.forgotMessage.set(null);
    this.forgotError.set(null);
    this.forgotLoading.set(false);
    this.receivedToken.set('');
    this.manualToken = '';
    this.showForgotModal.set(true);
  }

  closeForgotModal() {
    this.showForgotModal.set(false);
  }

  sendForgot() {
    if (!this.forgotEmail.trim()) return;
    
    this.forgotLoading.set(true);
    this.forgotError.set(null);
    this.forgotMessage.set(null);
    
    this.auth.forgotPassword(this.forgotEmail).subscribe({
      next: (res) => {
        this.forgotLoading.set(false);
        this.receivedToken.set('');
        this.forgotMessage.set(
          res.message || 'If your email is registered, we have sent a secure link.'
        );
      },
      error: (err) => {
        this.forgotLoading.set(false);
        this.forgotError.set(err?.error?.message || 'Failed to request reset.');
      }
    });
  }

  openResetModal(token: string) {
    this.receivedToken.set(token);
    this.resetTokenInput = token;
    this.resetPasswordInput = '';
    this.resetPasswordConfirm = '';
    this.resetError.set(null);
    this.resetSuccess.set(null);
    this.resetLoading.set(false);
    this.showForgotModal.set(false);
    this.showResetModal.set(true);
  }

  verifyAndOpenReset() {
    if (!this.manualToken.trim()) return;
    
    this.forgotLoading.set(true);
    this.forgotError.set(null);
    
    this.auth.validateResetToken(this.manualToken).subscribe({
      next: (res) => {
        this.forgotLoading.set(false);
        this.openResetModal(this.manualToken);
      },
      error: (err) => {
        this.forgotLoading.set(false);
        this.forgotError.set(err?.error?.message || 'Invalid or expired password reset token');
      }
    });
  }

  closeResetModal() {
    this.showResetModal.set(false);
  }

  sendReset() {
    if (!this.resetTokenInput || !this.resetPasswordInput) return;
    if (this.resetPasswordInput !== this.resetPasswordConfirm) {
      this.resetError.set('Passwords do not match');
      return;
    }
    if (this.resetPasswordInput.length < 6) {
      this.resetError.set('Password must be at least 6 characters');
      return;
    }
    
    this.resetLoading.set(true);
    this.resetError.set(null);
    this.resetSuccess.set(null);
    
    this.auth.resetPassword(this.resetTokenInput, this.resetPasswordInput).subscribe({
      next: (res) => {
        this.resetLoading.set(false);
        this.resetSuccess.set('Password reset successfully! You can now log in.');
        setTimeout(() => {
          this.closeResetModal();
        }, 2000);
      },
      error: (err) => {
        this.resetLoading.set(false);
        this.resetError.set(err?.error?.message || 'Failed to reset password. Token might be invalid/expired.');
      }
    });
  }
}
