import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Governorate {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/locations`;

  private governorates$?: Observable<Governorate[]>;

  getGovernorates(): Observable<Governorate[]> {
    if (!this.governorates$) {
      this.governorates$ = this.http.get<Governorate[]>(`${this.apiUrl}/governorates`).pipe(
        shareReplay(1)
      );
    }
    return this.governorates$;
  }

  getCities(governorateId: string): Observable<City[]> {
    return this.http.get<City[]>(`${this.apiUrl}/cities/${governorateId}`);
  }

  getDistricts(cityId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/districts/${cityId}`);
  }

  getGovernorateName(id: string): Observable<string> {
    return this.getGovernorates().pipe(
      map(govs => {
        const gov = govs.find(g => g.id === id);
        return gov ? gov.name : id;
      })
    );
  }

  getCityName(governorateId: string, cityId: string): Observable<string> {
    return this.getCities(governorateId).pipe(
      map(cities => {
        const city = cities.find(c => c.id === cityId);
        return city ? city.name : cityId;
      })
    );
  }
}
