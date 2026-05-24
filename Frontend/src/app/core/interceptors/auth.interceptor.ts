// ============================================================
// AUTH INTERCEPTOR
// Reads the JWT token from localStorage and attaches it as
// an Authorization header to every outgoing HTTP request.
//
// HOW TO REGISTER:
//   In app.ts → provideHttpClient(withInterceptors([authInterceptor]))
// ============================================================

import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'arch_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);

  const isPublicAuth = req.url.endsWith('/auth/login') || 
                       req.url.endsWith('/auth/register') || 
                       req.url.endsWith('/auth/forgot-password') || 
                       req.url.endsWith('/auth/reset-password');

  // If no token or it's a public auth endpoint, skip
  if (!token || isPublicAuth) {
    return next(req);
  }

  // Clone request and attach the Bearer token
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
