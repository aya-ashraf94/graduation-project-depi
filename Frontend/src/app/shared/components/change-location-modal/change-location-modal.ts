import { Component, input, output, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationSelectorComponent } from '../location-selector/location-selector';

@Component({
  selector: 'app-change-location-modal',
  standalone: true,
  imports: [CommonModule, LocationSelectorComponent],
  template: `
    <div class="loc-modal-overlay" *ngIf="isOpen()" (click)="closeModal()">
      <div class="loc-modal-card" (click)="$event.stopPropagation()">
        <button class="loc-modal-close" (click)="closeModal()">✕</button>

        <div class="loc-modal-header">
          <h3 class="loc-modal-title">Change Location</h3>
          <p class="loc-modal-subtitle">Choose your location to see nearby products</p>
        </div>

        <div class="loc-modal-body">
          <app-location-selector
            [initialGovernorate]="currentGovernorate()"
            [initialCity]="currentCity()"
            [initialDistrict]="currentDistrict()"
            (locationChange)="onLocationChange($event)"
          ></app-location-selector>
        </div>

        <div class="loc-modal-footer">
          <button class="loc-btn loc-btn-cancel" (click)="closeModal()">Cancel</button>
          <button class="loc-btn loc-btn-save" (click)="saveLocation()" [disabled]="!selectedLocation.governorate">
            Save Location
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loc-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .loc-modal-card {
      background: var(--white);
      border: 3px solid var(--black);
      border-radius: 12px;
      width: 90%;
      max-width: 440px;
      box-shadow: 8px 8px 0 var(--black);
      position: relative;
      max-height: 90vh;
      overflow-y: auto;
    }
    .loc-modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--white);
      border: 2px solid var(--black);
      font-size: 1rem;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 2px 2px 0 var(--black);
    }
    .loc-modal-header {
      padding: 1.5rem 1.5rem 0.5rem;
    }
    .loc-modal-title {
      font-family: var(--font-primary);
      font-size: 1.3rem;
      font-weight: 900;
      text-transform: uppercase;
      margin: 0;
    }
    .loc-modal-subtitle {
      font-family: var(--font-secondary);
      font-size: 0.8rem;
      color: var(--gray-3);
      margin: 0.25rem 0 0;
    }
    .loc-modal-body {
      padding: 1rem 1.5rem;
    }
    .loc-modal-footer {
      padding: 1rem 1.5rem;
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      border-top: 2px solid var(--black);
    }
    .loc-btn {
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      font-family: var(--font-primary);
      font-size: 0.75rem;
      font-weight: 900;
      text-transform: uppercase;
      cursor: pointer;
      border: 2px solid var(--black);
      transition: all 0.12s ease;
    }
    .loc-btn-cancel {
      background: var(--white);
      color: var(--black);
    }
    .loc-btn-save {
      background: var(--yellow);
      color: var(--black);
      box-shadow: 3px 3px 0 var(--black);
    }
    .loc-btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class ChangeLocationModalComponent {
  isOpen = input<boolean>(false);
  currentGovernorate = input<string>('');
  currentCity = input<string>('');
  currentDistrict = input<string>('');

  closed = output<void>();
  locationSaved = output<{ governorate: string; city: string; district: string }>();

  selectedLocation = { governorate: '', city: '', district: '' };

  closeModal() {
    this.closed.emit();
  }

  onLocationChange(loc: { governorate: string; city: string; district: string }) {
    this.selectedLocation = loc;
  }

  saveLocation() {
    if (this.selectedLocation.governorate) {
      this.locationSaved.emit(this.selectedLocation);
      this.closed.emit();
    }
  }
}
