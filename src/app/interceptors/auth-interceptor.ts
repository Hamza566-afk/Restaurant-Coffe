import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  let headers = req.headers;

  // Cross-origin (vercel.app → railway.app): JS cannot read the XSRF-TOKEN cookie,
  // so AuthService fetches it from GET /api/csrf-token and we attach it here.
  const xsrfToken = auth.getXsrfToken();
  if (xsrfToken && !headers.has('X-XSRF-TOKEN')) {
    headers = headers.set('X-XSRF-TOKEN', xsrfToken);
  }

  return next(req.clone({ withCredentials: true, headers }));
};
