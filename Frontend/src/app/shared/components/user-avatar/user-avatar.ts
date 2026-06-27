import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-avatar.html',
  styleUrl: './user-avatar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class UserAvatarComponent {
  readonly user = input.required<any>();
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly showOnlineDot = input<boolean>(false);
  readonly isOnline = input<boolean>(false);
}
