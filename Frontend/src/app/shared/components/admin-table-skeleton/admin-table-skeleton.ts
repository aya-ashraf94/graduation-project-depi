import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-table-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-table-skeleton.html',
  styleUrl: './admin-table-skeleton.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AdminTableSkeletonComponent {
  readonly rows = input<number>(5);
  readonly columns = input<Array<'avatar' | 'text' | 'badge' | 'actions' | 'thumb' | 'number'>>(['avatar', 'text', 'badge', 'actions']);

  readonly rowsArray = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
}
