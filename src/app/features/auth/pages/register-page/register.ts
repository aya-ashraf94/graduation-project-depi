import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { RegisterRequest } from '../../../../core/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="split-card">
        
        <!-- LEFT: FORM -->
        <div class="split-left">
          <div class="auth-header">
            <div class="brand-tag">NAFA3NI</div>
            <h2 class="auth-title">Create Account</h2>
            <p class="auth-desc">Join the community and start buying or selling today.</p>
          </div>

          <form class="auth-form" (ngSubmit)="register()">
            <div class="auth-row">
              <div class="auth-field">
                <input
                  id="register-firstname"
                  type="text"
                  class="auth-input"
                  placeholder="First name"
                  [(ngModel)]="form.firstName"
                  name="firstName"
                  required
                />
              </div>
              <div class="auth-field">
                <input
                  id="register-lastname"
                  type="text"
                  class="auth-input"
                  placeholder="Last name"
                  [(ngModel)]="form.lastName"
                  name="lastName"
                  required
                />
              </div>
            </div>

            <div class="auth-field">
              <input
                id="register-email"
                type="email"
                class="auth-input"
                placeholder="Email address"
                [(ngModel)]="form.email"
                name="email"
                required
              />
            </div>

            <div class="auth-row">
              <div class="auth-field">
                <input
                  id="register-password"
                  type="password"
                  class="auth-input"
                  placeholder="Password"
                  [(ngModel)]="form.password"
                  name="password"
                  required
                />
              </div>
              <div class="auth-field">
                <input
                  id="register-confirm"
                  type="password"
                  class="auth-input"
                  placeholder="Confirm password"
                  [(ngModel)]="form.confirmPassword"
                  name="confirmPassword"
                  required
                />
              </div>
            </div>

            <button type="submit" class="auth-submit-btn">
              REGISTER
            </button>
          </form>

          <div class="auth-footer">
            <p class="auth-link">Already have an account? <a routerLink="/auth/login">Sign In</a></p>
          </div>
        </div>

        <!-- RIGHT: GRAPHIC -->
        <div class="split-right">
          <div class="graphic-bg-pattern"></div>
          <div class="graphic-content">
            <div class="graphic-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 class="graphic-title">JOIN THE COMMUNITY</h3>
            <p class="graphic-desc">Get access to exclusive listings and connect directly with sellers on campus.</p>
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
      min-height: 90vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px 20px;
      box-sizing: border-box;
    }

    .split-card {
      display: flex;
      flex-direction: row-reverse;
      width: 100%;
      max-width: 1000px;
      background: var(--white);
      border: 3px solid var(--black);
      border-radius: var(--radius-lg);
      box-shadow: 8px 8px 0 var(--black);
      overflow: hidden;
      min-height: 560px;
      animation: riseUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes riseUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── LEFT SIDE (FORM) ───────────────────────── */
    .split-left {
      flex: 1;
      padding: 64px 48px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: var(--white);
    }

    .auth-header {
      margin-bottom: 32px;
      text-align: left;
    }

    .brand-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-primary);
      font-size: 0.85rem;
      font-weight: 900;
      letter-spacing: 1px;
      color: var(--black);
      margin-bottom: 24px;
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
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--black);
      line-height: 1.1;
      margin-bottom: 8px;
    }

    .auth-desc {
      font-family: var(--font-secondary);
      font-size: 0.9rem;
      color: var(--gray-3);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .auth-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .auth-field {
      display: flex;
      flex-direction: column;
    }

    .auth-input {
      font-family: var(--font-secondary);
      font-size: 0.95rem;
      padding: 14px 16px;
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

    .auth-submit-btn {
      align-self: center;
      margin-top: 16px;
      padding: 12px 32px;
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
      margin-top: 48px;
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
      flex: 1.1;
      background: var(--yellow);
      border-right: 3px solid var(--black);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 48px;
      overflow: hidden;
      z-index: 1;
    }

    .graphic-bg-pattern {
      position: absolute;
      inset: 0;
      opacity: 0.1;
      background-image: radial-gradient(var(--black) 2px, transparent 2px);
      background-size: 32px 32px;
      z-index: -1;
    }

    .graphic-content {
      background: var(--white);
      border: 3px solid var(--black);
      border-radius: var(--radius-md);
      padding: 40px;
      text-align: center;
      box-shadow: 8px 8px 0 var(--black);
      max-width: 320px;
      position: relative;
      z-index: 2;
    }

    .graphic-icon {
      width: 80px;
      height: 80px;
      background: var(--surface-2);
      border: 3px solid var(--black);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      box-shadow: 4px 4px 0 var(--black);
      color: var(--black);
    }

    .graphic-title {
      font-family: var(--font-primary);
      font-size: 2rem;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1;
      margin-bottom: 12px;
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
      top: 40px;
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
      bottom: 60px;
      left: 40px;
      box-shadow: 6px 6px 0 var(--black);
    }

    @media (max-width: 860px) {
      .split-card {
        flex-direction: column;
        max-width: 500px;
      }
      .split-right {
        display: none; /* Hide graphic on mobile */
      }
      .split-left {
        padding: 40px 32px;
      }
      .auth-row { grid-template-columns: 1fr; gap: 16px; }
    }
  `]
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  form = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' };

  register() {
    if (!this.form.email || !this.form.password || !this.form.firstName) return;
    if (this.form.password !== this.form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    
    const request: RegisterRequest = {
      firstName: this.form.firstName,
      lastName: this.form.lastName,
      email: this.form.email,
      password: this.form.password
    };
    
    this.auth.register(request);
    this.router.navigate(['/']);
  }
}
