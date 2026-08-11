import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Ensure cookies (Sanctum session) are always sent with every request
  const withCreds = req.clone({ withCredentials: true });
  return next(withCreds);
};
