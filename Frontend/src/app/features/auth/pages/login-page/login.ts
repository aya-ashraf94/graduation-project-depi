import { Component, inject } from '@angular/core';
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
              />
            </div>

            <div class="auth-options">
              <label class="remember-me">
                <input type="checkbox" class="auth-checkbox">
                <span>Remember me</span>
              </label>
              <a class="forgot-link" href="#">Forgot Password?</a>
            </div>

            <button type="submit" class="auth-submit-btn">
              LOGIN
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
      box-shadow: 0 0 0 3px rgba(232, 189, 24, 0.15);
    }

    .auth-input::placeholder {
      color: var(--gray-2);
      font-weight: 500;
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

    .auth-submit-btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 5px 5px 0 var(--black);
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
        box-shadow: inset -6px -6px 0 rgba(0,0,0,0.1);
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

  signIn() {
    if (!this.form.email || !this.form.password) return;
    this.auth.login(this.form);
    this.router.navigate(['/']);
  }
}
