import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-error-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-error-panel.html',
  styleUrl: './admin-error-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AdminErrorPanelComponent {
  readonly message = input<string | null>(null);
  readonly retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
