import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FeaturedListing {
  id: string;
  productId: string;
  sellerId: string;
  duration: number;
  amountPaid: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  product?: {
    id: string;
    title: string;
    thumbnail: string;
    price: number;
  };
}

@Injectable({ providedIn: 'root' })
export class FeaturedService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/featured`;

  getPrices(): Observable<{ [key: number]: number }> {
    return this.http.get<{ [key: number]: number }>(`${this.apiUrl}/prices`);
  }

  promoteProduct(productId: string, duration: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/promote`, { productId, duration }, { withCredentials: true });
  }

  getActiveFeatured(): Observable<FeaturedListing[]> {
    return this.http.get<FeaturedListing[]>(`${this.apiUrl}/active`);
  }

  getMyFeaturedListings(): Observable<FeaturedListing[]> {
    return this.http.get<FeaturedListing[]>(`${this.apiUrl}/my`, { withCredentials: true });
  }

  adminSetFeaturedPrice(duration: number, price: number): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/admin/featured-prices`, { duration, price }, { withCredentials: true });
  }
}