import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/settings`;

  getDiscount(): Observable<{ discount: number }> {
    return this.http.get<{ discount: number }>(`${this.apiUrl}/discount`);
  }

  updateDiscount(discount: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/discount`, { discount });
  }

  getCodFee(): Observable<{ codFeePercent: number }> {
    return this.http.get<{ codFeePercent: number }>(`${this.apiUrl}/cod-fee`);
  }

  getPlatformFee(): Observable<{ platformFeePercent: number }> {
    return this.http.get<{ platformFeePercent: number }>(`${this.apiUrl}/platform-fee`);
  }
}
