import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-loader.html',
  styleUrl: './admin-loader.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AdminLoaderComponent {
  readonly message = input<string>('Loading data...');
}
