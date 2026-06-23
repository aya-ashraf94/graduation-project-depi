import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="split-card">
        
        <div class="split-left">
          <div class="auth-header">
            <div class="brand-tag">NAFA3NI</div>
            <h2 class="auth-title">Reset Password</h2>
            <p class="auth-desc">Update your account credentials using your secure token</p>
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
          } @else {
            <form class="auth-form" (ngSubmit)="sendReset()">
              <div class="auth-field">
                <input
                  type="password"
                  class="auth-input"
                  placeholder="New Password (min 8 chars, 1 num, 1 spec)"
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  required
                  [disabled]="isLoading()"
                />
              </div>

              <div class="auth-field">
                <input
                  type="password"
                  class="auth-input"
                  placeholder="Confirm New Password"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required
                  [disabled]="isLoading()"
                />
              </div>
              
              <button type="submit" class="auth-submit-btn" [disabled]="isLoading()">
                {{ isLoading() ? 'RESETTING...' : 'RESET PASSWORD' }}
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
            <h3 class="graphic-title">COMPLEXITY MATTERS</h3>
            <p class="graphic-desc">Choose a robust password to defend your nafa3ni listings and transaction histories.</p>
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
export class ResetPassword implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.errorMessage.set('No token provided in the URL query.');
      }
    });
  }

  sendReset() {
    if (!this.token) {
      this.errorMessage.set('Invalid request session token.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()[\]{}|\\;:'",.<>/?~`\-_=+])[a-zA-Z0-9!@#$%^&*()[\]{}|\\;:'",.<>/?~`\-_=+]{8,}$/;
    if (!passwordRegex.test(this.newPassword)) {
      this.errorMessage.set('Password must be at least 8 characters long, contain at least 1 number, and 1 special character.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'Password reset successfully! You can now log in.');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to reset password. Token might be invalid/expired.');
      }
    });
  }
}
