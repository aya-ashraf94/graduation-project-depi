import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="split-card">
        
        <div class="split-left">
          <div class="auth-header">
            <div class="brand-tag">NAFA3NI</div>
            <h2 class="auth-title">Forgot Password</h2>
            <p class="auth-desc">Enter your email address to retrieve your reset token</p>
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

          @if (successMessage()) {
            <div class="auth-success-banner" style="background: var(--success); color: var(--black); border: 2px solid var(--black); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-family: var(--font-secondary); font-size: 0.85rem; font-weight: 700; box-shadow: 2px 2px 0 var(--black); margin-bottom: 1.5rem;">
              <span>{{ successMessage() }}</span>
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
            <form class="auth-form" (ngSubmit)="sendForgot()">
              <div class="auth-field">
                <input
                  type="email"
                  class="auth-input"
                  placeholder="Email address"
                  [(ngModel)]="email"
                  name="email"
                  required
                  [disabled]="isLoading()"
                />
              </div>
              
              <button type="submit" class="auth-submit-btn" [disabled]="isLoading()">
                {{ isLoading() ? 'SENDING...' : 'SEND TOKEN' }}
              </button>
            </form>
          }

          <div class="auth-footer">
            <p class="auth-link">Back to <a routerLink="/auth/login">LOGIN</a></p>
          </div>
        </div>

        <div class="split-right">
          <div class="graphic-bg-pattern"></div>
          <div class="graphic-content">
            <div class="graphic-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h3 class="graphic-title">RESET PASSWORD</h3>
            <p class="graphic-desc">Retrieve access token safely using our hashed database tokenization pipeline.</p>
          </div>
          <div class="dec-circle dec-1"></div>
          <div class="dec-box dec-2"></div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      background: var(--surface);
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.25rem;
      box-sizing: border-box;
    }

    .split-card {
      display: flex;
      flex-direction: row;
      width: 100%;
      max-width: 56.25rem;
      background: var(--white);
      border: 3px solid var(--black);
      border-radius: var(--radius-lg);
      box-shadow: 8px 8px 0 var(--black);
      overflow: hidden;
      min-height: 34.375rem;
      animation: riseUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes riseUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .split-left {
      flex: 1;
      padding: 3rem 2.5rem;
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
      display: inline-block;
      font-family: var(--font-primary);
      font-weight: 900;
      font-size: 0.8rem;
      background: var(--yellow);
      border: 2px solid var(--black);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-xs);
      box-shadow: 2px 2px 0 var(--black);
      margin-bottom: 1rem;
      color: var(--black);
    }

    .auth-title {
      font-family: var(--font-primary);
      font-weight: 900;
      font-size: 2.2rem;
      text-transform: uppercase;
      margin: 0 0 0.5rem 0;
      color: var(--black);
      line-height: 1.1;
    }

    .auth-desc {
      font-family: var(--font-secondary);
      font-size: 0.95rem;
      color: var(--gray-3);
      margin: 0;
    }

    .auth-error-banner {
      background: var(--danger);
      border: 2px solid var(--black);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      box-shadow: 3px 3px 0 var(--black);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--black);
      font-family: var(--font-secondary);
      font-size: 0.85rem;
      font-weight: 700;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .auth-field {
      position: relative;
    }

    .auth-input {
      width: 100%;
      padding: 0.875rem 1rem;
      font-family: var(--font-secondary);
      font-size: 0.95rem;
      border: 2.5px solid var(--black);
      border-radius: var(--radius-sm);
      background: var(--white);
      color: var(--black);
      outline: none;
      box-shadow: 3px 3px 0 var(--black);
      transition: var(--transition);
      box-sizing: border-box;
    }

    .auth-input:focus {
      background: var(--white);
      transform: translate(-1px, -1px);
      box-shadow: 4px 4px 0 var(--black);
    }

    .auth-submit-btn {
      align-self: flex-start;
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
      font-size: 0.9rem;
      color: var(--gray-3);
    }

    .auth-link a {
      color: var(--black);
      font-weight: 700;
      text-decoration: none;
    }

    .auth-link a:hover {
      text-decoration: underline;
    }

    .split-right {
      flex: 1;
      background: var(--primary);
      position: relative;
      overflow: hidden;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      box-sizing: border-box;
      border-left: 3px solid var(--black);
    }

    @media (min-width: 768px) {
      .split-right {
        display: flex;
      }
    }

    .graphic-bg-pattern {
      position: absolute;
      inset: 0;
      opacity: 0.1;
      background-image: radial-gradient(var(--black) 2px, transparent 2px);
      background-size: 20px 20px;
    }

    .graphic-content {
      position: relative;
      z-index: 2;
      color: var(--black);
      text-align: center;
      max-width: 320px;
    }

    .graphic-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      background: var(--white);
      border: 3.5px solid var(--black);
      border-radius: var(--radius-lg);
      box-shadow: 6px 6px 0 var(--black);
      margin-bottom: 2rem;
      transform: rotate(-3deg);
    }

    .graphic-title {
      font-family: var(--font-primary);
      font-weight: 900;
      font-size: 1.6rem;
      text-transform: uppercase;
      margin: 0 0 1rem 0;
      letter-spacing: -0.5px;
    }

    .graphic-desc {
      font-family: var(--font-secondary);
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0;
      opacity: 0.85;
    }

    .dec-circle {
      position: absolute;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 4px solid var(--black);
      background: var(--yellow);
      z-index: 1;
    }

    .dec-1 {
      top: -2.5rem;
      right: -2.5rem;
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
  `]
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
