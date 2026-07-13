import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  sending = signal(false);

  contactForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  submit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    const { name, email, message } = this.contactForm.value;

    this.http.post<{ message: string }>(`${environment.apiUrl}/support/contact`, { name, email, message })
      .subscribe({
        next: (res) => {
          this.toast.success(res.message);
          this.contactForm.reset();
          this.sending.set(false);
        },
        error: (err) => {
          const msg = err.error?.message || 'Failed to send message. Please try again.';
          this.toast.error(msg);
          this.sending.set(false);
        }
      });
  }
}
