import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CountdownTimerService {
  formatTimeRemaining(expiresAt: Date | string | number): string {
    const expiresTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = expiresTime - now;

    if (diff <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
  }
}
