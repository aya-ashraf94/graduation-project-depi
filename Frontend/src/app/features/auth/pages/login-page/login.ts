import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { LoginRequest } from '../../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="split-card">
        
        <!-- LEFT: FORM -->
        <div class="split-left">
          <div class="auth-header">
            <div class="brand-tag">NAFA3NI</div>
            <h2 class="auth-title">Welcome Back</h2>
            <p class="auth-desc">Hey, welcome back to your special place</p>
          </div>

          @if (errorMessage()) {
            <div class="auth-error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }
          
          <form class="auth-form" (ngSubmit)="signIn()">
            <div class="auth-field">
              <input
                id="login-email"
                type="email"
                class="auth-input"
                placeholder="Email address"
                [(ngModel)]="form.email"
                name="email"
                required
                [disabled]="isLoading()"
              />
            </div>
            
            <div class="auth-field">
              <input
                id="login-password"
                type="password"
                class="auth-input"
                placeholder="Password"
                [(ngModel)]="form.password"
                name="password"
                required
                [disabled]="isLoading()"
              />
            </div>

            <div class="auth-options">
              <label class="remember-me">
                <input type="checkbox" class="auth-checkbox" [disabled]="isLoading()">
                <span>Remember me</span>
              </label>
              <a class="forgot-link" routerLink="/auth/forgot-password">Forgot Password?</a>
            </div>

            <button type="submit" class="auth-submit-btn" [disabled]="isLoading()">
              {{ isLoading() ? 'LOGGING IN...' : 'LOGIN' }}
            </button>
          </form>

          <div class="auth-footer">
            <p class="auth-link">Don't have an account? <a routerLink="/auth/register">REGISTER</a></p>
          </div>
        </div>

        <!-- RIGHT: GRAPHIC -->
        <div class="split-right">
          <div class="graphic-bg-pattern"></div>
          <div class="graphic-content">
            <div class="graphic-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h3 class="graphic-title">SECURE YOUR TRADES</h3>
            <p class="graphic-desc">Join thousands of students securely buying, selling, and trading on campus.</p>
          </div>
          <!-- Decorative abstract elements -->
          <div class="dec-circle dec-1"></div>
          <div class="dec-box dec-2"></div>
        </div>

      </div>
    </div>

    <!-- FORGOT PASSWORD MODAL -->
    <div class="report-overlay" *ngIf="showForgotModal()" (click)="closeForgotModal()" style="position: fixed; inset: 0; background: color-mix(in srgb, var(--black) 60%, transparent); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1.25rem;">
      <div class="modal-standard-card" (click)="$event.stopPropagation()" style="background: var(--white); border: 3px solid var(--black); border-radius: var(--radius-md); max-width: 450px; width: 100%; box-shadow: 6px 6px 0 var(--black); padding: 2rem; position: relative;">
        <button class="modal-standard-close" (click)="closeForgotModal()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.25rem; font-weight: 700; cursor: pointer;">✕</button>

        <h3 style="font-family: var(--font-primary); font-weight: 900; font-size: 1.5rem; text-transform: uppercase; margin-bottom: 0.5rem;">Reset Password</h3>
        <p style="font-family: var(--font-secondary); font-size: 0.9rem; color: var(--gray-3); margin-bottom: 1.5rem;">Enter your email address and we'll send you a password reset token.</p>

        @if (forgotError()) {
          <div style="background: var(--danger); color: var(--black); border: 2px solid var(--black); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-family: var(--font-secondary); font-size: 0.85rem; font-weight: 700; box-shadow: 2px 2px 0 var(--black); margin-bottom: 1rem;">
            {{ forgotError() }}
          </div>
        }

        @if (forgotMessage()) {
          <div style="background: var(--success); color: var(--black); border: 2px solid var(--black); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-family: var(--font-secondary); font-size: 0.85rem; font-weight: 700; box-shadow: 2px 2px 0 var(--black); margin-bottom: 1.5rem;">
            {{ forgotMessage() }}
          </div>
          
          <div class="mock-email-inbox" style="border: 2px dashed var(--black); background: var(--surface-2); padding: 1.25rem; border-radius: var(--radius-sm); text-align: left; box-shadow: 2px 2px 0 var(--black); margin-top: 1rem;">
            <div style="font-weight: 800; font-family: var(--font-primary); font-size: 0.9rem; border-bottom: 2px solid var(--black); padding-bottom: 0.5rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
              <span>📬 DEV SANDBOX EMAIL</span>
              <span style="background: var(--yellow); color: var(--black); border: 1.5px solid var(--black); padding: 1px 6px; border-radius: 4px; font-size: 0.7rem;">ACTION REQUIRED</span>
            </div>
            <p style="font-size: 0.85rem; margin-bottom: 1rem; color: var(--black); font-family: var(--font-secondary);">
              The secure reset link has been printed to the **Node.js server console terminal** to mimic email receipt. Please copy the token from the terminal log and paste it here:
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <input
                type="password"
                placeholder="Paste Reset Token Here"
                [(ngModel)]="manualToken"
                name="manualToken"
                required
                style="font-family: var(--font-secondary); font-size: 0.95rem; padding: 0.625rem 0.875rem; border: 2px solid var(--black); border-radius: var(--radius-sm); box-shadow: 2px 2px 0 var(--black); outline: none; background: var(--white); color: var(--black);"
              />
              <button *ngIf="manualToken && manualToken.trim()" type="button" (click)="verifyAndOpenReset()" style="width: 100%; text-align: center; font-weight: 800; font-size: 0.85rem; text-transform: uppercase; background: var(--yellow); border: 2px solid var(--black); padding: 8px; border-radius: var(--radius-xs); box-shadow: 2px 2px 0 var(--black); cursor: pointer; font-family: var(--font-primary); margin-top: 0.5rem; color: var(--black);">
                🔑 OPEN RESET PASSWORD FORM
              </button>
            </div>
          </div>
        } @else {
          <form (ngSubmit)="sendForgot()" style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
            <input
              type="email"
              placeholder="Email address"
              [(ngModel)]="forgotEmail"
              name="forgotEmail"
              required
              [disabled]="forgotLoading()"
              style="font-family: var(--font-secondary); font-size: 0.95rem; padding: 0.625rem 0.875rem; border: 2px solid var(--black); border-radius: var(--radius-sm); box-shadow: 2px 2px 0 var(--black); outline: none;"
            />
            <button type="submit" [disabled]="forgotLoading()" style="padding: 0.75rem 24px; background: var(--yellow); border: 2px solid var(--black); border-radius: var(--radius-sm); font-family: var(--font-secondary); font-size: 0.95rem; font-weight: 700; box-shadow: 3px 3px 0 var(--black); cursor: pointer; color: var(--black); align-self: flex-end;">
              {{ forgotLoading() ? 'SENDING...' : 'SEND TOKEN' }}
            </button>
          </form>
        }
      </div>
    </div>

    <!-- RESET PASSWORD MODAL -->
    <div class="report-overlay" *ngIf="showResetModal()" (click)="closeResetModal()" style="position: fixed; inset: 0; background: color-mix(in srgb, var(--black) 60%, transparent); display: flex; align-items: center; justify-content: center; z-index: 1001; padding: 1.25rem;">
      <div class="modal-standard-card" (click)="$event.stopPropagation()" style="background: var(--white); border: 3px solid var(--black); border-radius: var(--radius-md); max-width: 450px; width: 100%; box-shadow: 6px 6px 0 var(--black); padding: 2rem; position: relative;">
        <button class="modal-standard-close" (click)="closeResetModal()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.25rem; font-weight: 700; cursor: pointer;">✕</button>

        <h3 style="font-family: var(--font-primary); font-weight: 900; font-size: 1.5rem; text-transform: uppercase; margin-bottom: 0.5rem;">Reset Your Password</h3>
        <p style="font-family: var(--font-secondary); font-size: 0.9rem; color: var(--gray-3); margin-bottom: 1.5rem;">Enter a strong new password below to update your account access.</p>

        @if (resetError()) {
          <div style="background: var(--danger); color: var(--black); border: 2px solid var(--black); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-family: var(--font-secondary); font-size: 0.85rem; font-weight: 700; box-shadow: 2px 2px 0 var(--black); margin-bottom: 1rem;">
            {{ resetError() }}
          </div>
        }

        @if (resetSuccess()) {
          <div style="background: var(--success); color: var(--black); border: 2px solid var(--black); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-family: var(--font-secondary); font-size: 0.85rem; font-weight: 700; box-shadow: 2px 2px 0 var(--black); margin-bottom: 1.5rem;">
            {{ resetSuccess() }}
          </div>
        } @else {
          <form (ngSubmit)="sendReset()" style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
            <input
              type="hidden"
              [(ngModel)]="resetTokenInput"
              name="resetTokenInput"
              required
            />
            
            <div style="display: flex; flex-direction: column; gap: 0.25rem; text-align: left;">
              <label style="font-weight: 700; font-size: 0.8rem; font-family: var(--font-secondary); color: var(--black);">NEW PASSWORD</label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                [(ngModel)]="resetPasswordInput"
                name="resetPasswordInput"
                required
                [disabled]="resetLoading()"
                style="font-family: var(--font-secondary); font-size: 0.95rem; padding: 0.625rem 0.875rem; border: 2px solid var(--black); border-radius: var(--radius-sm); box-shadow: 2px 2px 0 var(--black); outline: none;"
              />
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.25rem; text-align: left;">
              <label style="font-weight: 700; font-size: 0.8rem; font-family: var(--font-secondary); color: var(--black);">CONFIRM PASSWORD</label>
              <input
                type="password"
                placeholder="Confirm password"
                [(ngModel)]="resetPasswordConfirm"
                name="resetPasswordConfirm"
                required
                [disabled]="resetLoading()"
                style="font-family: var(--font-secondary); font-size: 0.95rem; padding: 0.625rem 0.875rem; border: 2px solid var(--black); border-radius: var(--radius-sm); box-shadow: 2px 2px 0 var(--black); outline: none;"
              />
            </div>

            <button type="submit" [disabled]="resetLoading()" style="padding: 0.75rem 24px; background: var(--yellow); border: 2px solid var(--black); border-radius: var(--radius-sm); font-family: var(--font-secondary); font-size: 0.95rem; font-weight: 700; box-shadow: 3px 3px 0 var(--black); cursor: pointer; color: var(--black); align-self: flex-end; margin-top: 0.5rem;">
              {{ resetLoading() ? 'RESETTING...' : 'RESET PASSWORD' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      background: var(--surface);
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.25rem;
      box-sizing: border-box;
    }

    .split-card {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 31.25rem;
      background: var(--white);
      border: 3px solid var(--black);
      border-radius: var(--radius-lg);
      box-shadow: 8px 8px 0 var(--black);
      overflow: hidden;
      min-height: 30rem;
      animation: riseUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes riseUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── LEFT SIDE (FORM) ───────────────────────── */
    .split-left {
      flex: 1;
      padding: 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: var(--white);
    }

    .auth-header {
      margin-bottom: 2rem;
      text-align: left;
    }

    .brand-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-family: var(--font-primary);
      font-size: 0.85rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: var(--black);
      margin-bottom: 1.5rem;
    }

    .brand-tag::before {
      content: '';
      display: block;
      width: 12px;
      height: 12px;
      background: var(--yellow);
      border: 2px solid var(--black);
    }

    .auth-title {
      font-family: var(--font-secondary);
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--black);
      line-height: 1.1;
      margin-bottom: 0.375rem;
    }

    .auth-desc {
      font-family: var(--font-secondary);
      font-size: 0.9rem;
      color: var(--gray-3);
    }

    .auth-error-banner {
      background: var(--danger);
      color: var(--black);
      border: 3px solid var(--black);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      font-family: var(--font-secondary);
      font-size: 0.85rem;
      font-weight: 700;
      box-shadow: 3px 3px 0 var(--black);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      animation: shake 0.2s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .auth-field {
      display: flex;
      flex-direction: column;
    }

    .auth-input {
      font-family: var(--font-secondary);
      font-size: 0.9rem;
      padding: 0.625rem 0.875rem;
      background: var(--white);
      border: 2px solid var(--gray-2);
      border-radius: var(--radius-sm);
      outline: none;
      width: 100%;
      box-sizing: border-box;
      color: var(--black);
      transition: var(--transition);
    }

    .auth-input:focus {
      border-color: var(--yellow-dark);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--yellow) 15%, transparent);
    }

    .auth-input::placeholder {
      color: var(--gray-2);
      font-weight: 500;
    }

    .auth-input:disabled {
      background: var(--surface-2);
      cursor: not-allowed;
    }

    .auth-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.25rem;
      margin-bottom: 0.5rem;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .auth-checkbox {
      width: 16px;
      height: 16px;
      accent-color: var(--yellow-dark);
      cursor: pointer;
    }

    .remember-me span {
      font-family: var(--font-secondary);
      font-size: 0.8rem;
      color: var(--gray-3);
      font-weight: 500;
    }

    .forgot-link {
      font-family: var(--font-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--gray-3);
      text-decoration: none;
      transition: var(--transition);
    }

    .forgot-link:hover {
      color: var(--black);
      text-decoration: underline;
    }

    .auth-submit-btn {
      align-self: center;
      margin-top: 0.5rem;
      padding: 0.75rem 32px;
      background: var(--yellow);
      border: 2px solid var(--black);
      border-radius: var(--radius-sm);
      font-family: var(--font-secondary);
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 3px 3px 0 var(--black);
      transition: var(--transition);
      color: var(--black);
    }

    .auth-submit-btn:hover:not(:disabled) {
      transform: translate(-2px, -2px);
      box-shadow: 5px 5px 0 var(--black);
    }

    .auth-submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: 3px 3px 0 var(--black) !important;
    }

    .auth-footer {
      margin-top: 2rem;
    }

    .auth-link {
      font-family: var(--font-secondary);
      font-size: 0.85rem;
      color: var(--gray-3);
    }

    .auth-link a {
      font-weight: 700;
      color: var(--yellow-dark);
      text-decoration: none;
    }

    .auth-link a:hover {
      text-decoration: underline;
    }

    /* ── RIGHT SIDE (GRAPHIC) ─────────────────────── */
    .split-right {
      display: none; /* Hide graphic on mobile by default */
    }

    /* Progressive enhancement for Desktop (min-width: 861px) */
    @media (min-width: 861px) {
      .split-card {
        flex-direction: row;
        max-width: 800px;
      }

      .split-left {
        padding: 2rem 40px;
      }

      .split-right {
        display: flex;
        flex: 1;
        background: var(--yellow);
        border-left: 3px solid var(--black);
        position: relative;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 2rem;
        overflow: hidden;
        z-index: 1;
      }

      .graphic-bg-pattern {
        position: absolute;
        inset: 0;
        opacity: 0.1;
        background-image: radial-gradient(var(--black) 2px, transparent 2px);
        background-size: 2rem 2rem;
        z-index: -1;
      }

      .graphic-content {
        background: var(--white);
        border: 3px solid var(--black);
        border-radius: var(--radius-md);
        padding: 1.5rem;
        text-align: center;
        box-shadow: 6px 6px 0 var(--black);
        max-width: 16.25rem;
        position: relative;
        z-index: 2;
      }

      .graphic-icon {
        width: 60px;
        height: 60px;
        background: var(--surface-2);
        border: 3px solid var(--black);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        box-shadow: 3px 3px 0 var(--black);
        color: var(--black);
      }

      .graphic-title {
        font-family: var(--font-primary);
        font-size: 1.5rem;
        font-weight: 900;
        text-transform: uppercase;
        line-height: 1;
        margin-bottom: 0.5rem;
      }

      .graphic-desc {
        font-family: var(--font-secondary);
        font-size: 0.95rem;
        color: var(--gray-3);
        line-height: 1.5;
      }

      /* Decorative elements */
      .dec-circle {
        position: absolute;
        width: 120px;
        height: 120px;
        border: 4px solid var(--black);
        border-radius: 50%;
        background: var(--white);
        z-index: 1;
      }
      .dec-1 {
        top: 2.5rem;
        right: -40px;
        box-shadow: inset -6px -6px 0 color-mix(in srgb, var(--black) 10%, transparent);
      }

      .dec-box {
        position: absolute;
        width: 80px;
        height: 80px;
        border: 4px solid var(--black);
        background: var(--white);
        z-index: 1;
        transform: rotate(15deg);
      }
      .dec-2 {
        bottom: 3.75rem;
        left: 2.5rem;
        box-shadow: 6px 6px 0 var(--black);
      }
    }
  `]
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
