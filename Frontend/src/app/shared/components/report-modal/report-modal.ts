import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-modal.html',
  styleUrl: './report-modal.css'
})
export class ReportModal {
  private productService = inject(ProductService);

  @Input({ required: true }) productId!: string;
  @Output() close = new EventEmitter<boolean>();

  reportReason = signal('');
  reportDetails = signal('');
  submittingReport = signal(false);
  reportSubmitted = signal(false);
  reportError = signal('');

  closeModal(clear = false) {
    this.close.emit(clear);
  }

  submitReport() {
    if (!this.productId) return;
    const reason = this.reportReason();
    const details = this.reportDetails();

    this.submittingReport.set(true);
    this.reportError.set('');

    this.productService.reportProduct(this.productId, reason, details).subscribe({
      next: () => {
        this.submittingReport.set(false);
        this.reportSubmitted.set(true);
      },
      error: (err: any) => {
        console.error('Error submitting report:', err);
        this.submittingReport.set(false);
        this.reportError.set(err?.error?.message || 'Failed to submit report. Please try again.');
      }
    });
  }
}
