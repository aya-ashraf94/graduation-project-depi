import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, filter, Observable, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'nafa3ni_token';
const REFRESH_TOKEN_KEY = 'nafa3ni_refresh';
const USER_KEY = 'nafa3ni_user';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/** Endpoints that never need an Authorization header */
function isPublicAuth(url: string): boolean {
  return (
    url.endsWith('/auth/login') ||
    url.endsWith('/auth/register') ||
    url.endsWith('/auth/forgot-password') ||
    url.endsWith('/auth/reset-password') ||
    url.endsWith('/auth/refresh-token') ||
    url.endsWith('/auth/logout')
  );
}

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function clearSession(router: Router): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  router.navigate(['/auth/login']);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token || isPublicAuth(req.url)) {
    return next(req);
  }

  return next(addToken(req, token)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        return handle401Error(req, next, router, http);
      }
      return throwError(() => err);
    })
  );
};

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  router: Router,
  http: HttpClient,
): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!storedRefreshToken) {
      isRefreshing = false;
      clearSession(router);
      return throwError(() => new Error('No refresh token available'));
    }

    return http
      .post<{ token: string; refreshToken: string }>(`${environment.apiUrl}/auth/refresh-token`, {
        refreshToken: storedRefreshToken,
      })
      .pipe(
        switchMap((res) => {
          isRefreshing = false;
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
          refreshTokenSubject.next(res.token);
          return next(addToken(req, res.token));
        }),
        catchError((refreshErr) => {
          isRefreshing = false;
          clearSession(router);
          return throwError(() => refreshErr);
        }),
      );
  } else {
    return refreshTokenSubject.pipe(
      filter((t): t is string => t !== null),
      take(1),
      switchMap((t) => next(addToken(req, t))),
    );
  }
}
