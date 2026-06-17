import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  name = signal('');
  email = signal('');
  message = signal('');
  sending = signal(false);

  submit(): void {
    const name = this.name().trim();
    const email = this.email().trim();
    const message = this.message().trim();

    if (!name || !email || !message) {
      this.toast.error('Please fill in all fields');
      return;
    }

    this.sending.set(true);
    this.http.post<{ message: string }>(`${environment.apiUrl}/support/contact`, { name, email, message })
      .subscribe({
        next: (res) => {
          this.toast.success(res.message);
          this.name.set('');
          this.email.set('');
          this.message.set('');
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
