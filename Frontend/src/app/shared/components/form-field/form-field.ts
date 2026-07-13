import { Component, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';
import { getFieldError } from '../../utils/validators';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
  encapsulation: ViewEncapsulation.None
})
export class FormFieldComponent {
  readonly label = input<string>('');
  readonly control = input<AbstractControl | null>(null);
  readonly hint = input<string>('');
  readonly required = input(false);
  readonly fullWidth = input(false);

  get error(): string | null {
    return getFieldError(this.control());
  }
}
