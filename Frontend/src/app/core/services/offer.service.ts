import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Offer, MakeOfferRequest } from '../models/offer.model';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class OfferService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/offers`;

  activeReservation = signal<Offer | null>(null);

  checkActiveReservation(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.activeReservation.set(null);
      return;
    }

    this.getMyOffers().subscribe({
      next: (offers) => {
        const active = offers.find(o => 
          o.status === 'accepted' && 
          o.buyerId === currentUser.id && 
          o.expiresAt && 
          new Date(o.expiresAt) > new Date()
        );
        this.activeReservation.set(active || null);
      },
      error: (err) => {
        console.error('Error checking active reservation:', err);
        this.activeReservation.set(null);
      }
    });
  }

  makeOffer(payload: MakeOfferRequest): Observable<{ message: string; offer: Offer; conversationId: string }> {
    return this.http.post<{ message: string; offer: Offer; conversationId: string }>(this.apiUrl, payload);
  }

  getMyOffers(): Observable<Offer[]> {
    return this.http.get<Offer[]>(this.apiUrl);
  }

  getOffer(offerId: string): Observable<Offer> {
    return this.http.get<Offer>(`${this.apiUrl}/${offerId}`);
  }

  acceptOffer(offerId: string): Observable<Offer> {
    return this.http.patch<Offer>(`${this.apiUrl}/${offerId}/accept`, {});
  }

  rejectOffer(offerId: string): Observable<Offer> {
    return this.http.patch<Offer>(`${this.apiUrl}/${offerId}/reject`, {});
  }

  counterOffer(offerId: string, counterAmount: number): Observable<Offer> {
    return this.http.patch<Offer>(`${this.apiUrl}/${offerId}/counter`, { counterAmount });
  }
}
