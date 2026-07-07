import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../../core/services/confirm.service';
import { BaseModalComponent } from '../base-modal/base-modal';

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [CommonModule, BaseModalComponent],
  templateUrl: './confirm.html',
  styleUrl: './confirm.css'
})
export class Confirm {
  protected confirmService = inject(ConfirmService);
}
