import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-required-modal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auth-required-modal.html',
  styleUrl: './auth-required-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AuthRequiredModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly closed = output<void>();

  onClose(): void {
    this.closed.emit();
  }
}
