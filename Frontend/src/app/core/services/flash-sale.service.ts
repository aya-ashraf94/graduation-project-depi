import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FlashSale } from '../models/flash-sale.model';

@Injectable({ providedIn: 'root' })
export class FlashSaleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/flash-sales`;
  private adminApiUrl = `${environment.apiUrl}/admin/flash-sales`;

  activeSales = signal<FlashSale[]>([]);
  private _salesChanged = new Subject<void>();
  salesChanged$ = this._salesChanged.asObservable();

  refreshActiveSales(): void {
    this.getActiveFlashSales().subscribe({
      next: (sales) => {
        this.activeSales.set(sales);
        this._salesChanged.next();
      },
      error: () => {},
    });
  }

  getActiveFlashSales(): Observable<FlashSale[]> {
    return this.http.get<FlashSale[]>(`${this.apiUrl}/active`);
  }

  getAllFlashSales(): Observable<FlashSale[]> {
    return this.http.get<FlashSale[]>(`${this.adminApiUrl}`);
  }

  createFlashSale(payload: Partial<FlashSale>): Observable<FlashSale> {
    return this.http.post<FlashSale>(`${this.adminApiUrl}`, payload).pipe(
      tap(() => this.refreshActiveSales())
    );
  }

  updateFlashSale(id: string, payload: Partial<FlashSale>): Observable<FlashSale> {
    return this.http.patch<FlashSale>(`${this.adminApiUrl}/${id}`, payload).pipe(
      tap(() => this.refreshActiveSales())
    );
  }

  deleteFlashSale(id: string): Observable<any> {
    return this.http.delete(`${this.adminApiUrl}/${id}`).pipe(
      tap(() => this.refreshActiveSales())
    );
  }
}
