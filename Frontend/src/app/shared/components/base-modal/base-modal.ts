import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-modal.html',
  styleUrl: './base-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BaseModalComponent {
  readonly isOpen = input.required<boolean>();
  readonly preventClose = input(false);
  readonly close = output<void>();
}
