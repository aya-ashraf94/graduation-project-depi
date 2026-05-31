import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  isOpen = signal(false);
  message = signal('');
  title = signal('Confirmation Required');
  private _onConfirm: (() => void) | null = null;
  private _onCancel: (() => void) | null = null;

  show(options: { title?: string; message: string; onConfirm: () => void; onCancel?: () => void }): void {
    this.title.set(options.title || 'Confirmation Required');
    this.message.set(options.message);
    this._onConfirm = options.onConfirm;
    this._onCancel = options.onCancel || null;
    this.isOpen.set(true);
  }

  confirm(): void {
    if (this._onConfirm) {
      this._onConfirm();
    }
    this.close();
  }

  cancel(): void {
    if (this._onCancel) {
      this._onCancel();
    }
    this.close();
  }

  private close(): void {
    this.isOpen.set(false);
    this._onConfirm = null;
    this._onCancel = null;
  }
}
