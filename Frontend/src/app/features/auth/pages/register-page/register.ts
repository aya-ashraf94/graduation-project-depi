import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { RegisterRequest } from '../../../../core/models/user.model';
import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  form = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' };
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  register() {
    if (!this.form.email || !this.form.password || !this.form.firstName) return;
    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage.set("Passwords do not match");
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const request: RegisterRequest = {
      firstName: this.form.firstName,
      lastName: this.form.lastName,
      email: this.form.email,
      password: this.form.password
    };

    this.auth.register(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Registration failed');
      }
    });
  }
}
