import { Component, OnInit, input, output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService, Governorate, City } from '../../../core/services/location.service';

@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="location-selector-fields">
      <div class="form-group">
        <label class="form-label">{{ governorateLabel() }}</label>
        <select
          class="form-input"
          [ngModel]="selectedGovernorateId"
          (ngModelChange)="onGovernorateChange($event)"
        >
          <option value="">Select Governorate...</option>
          @for (gov of governorates; track gov.id) {
            <option [value]="gov.id">{{ gov.name }}</option>
          }
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">{{ cityLabel() }}</label>
        <select
          class="form-input"
          [ngModel]="selectedCityId"
          (ngModelChange)="onCityChange($event)"
          [disabled]="!selectedGovernorateId"
        >
          <option value="">Select City...</option>
          @for (city of cities; track city.id) {
            <option [value]="city.id">{{ city.name }}</option>
          }
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">{{ districtLabel() }}</label>
        <input
          type="text"
          class="form-input"
          [ngModel]="selectedDistrict"
          (ngModelChange)="onDistrictChange($event)"
          placeholder="e.g. Zamalek, Maadi, Nasr City..."
        />
      </div>
    </div>
  `,
  styles: [`
    .location-selector-fields {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .form-label {
      font-family: var(--font-primary);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--black);
      letter-spacing: 0.05em;
    }
    .form-input {
      width: 100%;
      padding: 0.55rem 0.65rem;
      border: 2px solid var(--black);
      border-radius: 6px;
      font-family: var(--font-secondary);
      font-size: 0.85rem;
      background: var(--white);
      outline: none;
      box-sizing: border-box;
    }
    .form-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class LocationSelectorComponent implements OnInit {
  private locationService = inject(LocationService);
  private cdr = inject(ChangeDetectorRef);

  governorateLabel = input('GOVERNORATE');
  cityLabel = input('CITY');
  districtLabel = input('DISTRICT / NEIGHBORHOOD');

  initialGovernorate = input<string>('');
  initialCity = input<string>('');
  initialDistrict = input<string>('');

  locationChange = output<{ governorate: string; city: string; district: string }>();

  governorates: Governorate[] = [];
  cities: City[] = [];

  selectedGovernorateId = '';
  selectedCityId = '';
  selectedDistrict = '';

  ngOnInit() {
    this.locationService.getGovernorates().subscribe(govs => {
      this.governorates = govs;
      if (this.initialGovernorate()) {
        this.selectedGovernorateId = this.initialGovernorate();
        this.loadCities();
      }
      this.cdr.detectChanges();
    });
  }

  onGovernorateChange(id: string) {
    this.selectedGovernorateId = id;
    this.selectedCityId = '';
    this.selectedDistrict = '';
    this.cities = [];
    this.emitChange();
    if (id) {
      this.loadCities();
    }
    this.cdr.detectChanges();
  }

  onCityChange(id: string) {
    this.selectedCityId = id;
    this.emitChange();
    this.cdr.detectChanges();
  }

  onDistrictChange(district: string) {
    this.selectedDistrict = district;
    this.emitChange();
    this.cdr.detectChanges();
  }

  private loadCities() {
    if (this.selectedGovernorateId) {
      this.locationService.getCities(this.selectedGovernorateId).subscribe(cities => {
        this.cities = cities;
        if (this.initialCity() && this.selectedGovernorateId === this.initialGovernorate()) {
          this.selectedCityId = this.initialCity();
          this.selectedDistrict = this.initialDistrict();
          this.emitChange();
        }
        this.cdr.detectChanges();
      });
    }
  }

  private emitChange() {
    this.locationChange.emit({
      governorate: this.selectedGovernorateId,
      city: this.selectedCityId,
      district: this.selectedDistrict,
    });
  }
}
