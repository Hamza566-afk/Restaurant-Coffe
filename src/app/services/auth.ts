import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = environment.apiUrl; 
  private serverUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  /** Reactive signal holding the currently authenticated user payload */
  readonly currentUser = signal<any>(null);

  /** Reactive signal holding the current shop details */
  readonly currentShop = computed(() => this.currentUser()?.shop ?? null);

  /** Signal/Getter for current shop currency (Fallback to currency_code, currencyCode, or TND) */
  readonly currentCurrency = computed(() => {
    const shop = this.currentShop();
    return shop?.currency_code || shop?.currencyCode || localStorage.getItem('currency_code') || 'TND';
  });

  private xsrfToken: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  getXsrfToken(): string | null {
    return this.xsrfToken;
  }

  prepareCsrf(): Observable<string> {
    return this.http
      .get(`${this.serverUrl}/sanctum/csrf-cookie`, { withCredentials: true })
      .pipe(
        switchMap(() =>
          this.http.get<{ csrf_token: string }>(`${this.apiUrl}/csrf-token`, {
            withCredentials: true,
          })
        ),
        tap((res) => {
          this.xsrfToken = res.csrf_token;
        }),
        switchMap((res) => of(res.csrf_token))
      );
  }

  getCsrfCookie(): Observable<any> {
    return this.prepareCsrf();
  }

  getCountries(): Observable<any> {
    return this.http.get(`${this.apiUrl}/countries`, { withCredentials: true });
  }

  getUser(): any {
    return this.currentUser();
  }

  /** Synchronous helper for the current shop profile */
  getShop(): any {
    return this.currentShop();
  }

  /** Added getUserShop() for direct component compatibility */
  getUserShop(): any {
    return this.currentShop();
  }

  /** Get currency code directly */
  getCurrency(): string {
    return this.currentCurrency();
  }

  getProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/products`, { withCredentials: true });
  }

  getOwnerName(): string {
    const user = this.currentUser();
    return user?.name ?? '';
  }

  /**
   * Synchronize Currency and Locale into localStorage & state
   */
  private syncCountrySettings(userPayload: any): void {
    const shop = userPayload?.shop;
    const country = shop?.country || userPayload?.country;

    const currencyCode = shop?.currency_code || shop?.currencyCode || country?.currency_code || country?.currencyCode;
    const locale = shop?.locale || country?.locale;

    if (currencyCode) {
      localStorage.setItem('currency_code', currencyCode);
    }
    if (locale) {
      localStorage.setItem('app_locale', locale);
    }
  }

  login(credentials: any): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/login`, credentials, { withCredentials: true })),
      switchMap(() => this.prepareCsrf()),
      switchMap(() => this.http.get(`${this.apiUrl}/user`, { withCredentials: true })),
      tap((res: any) => {
        const user = res?.user ?? res;
        this.currentUser.set(user);
        this.syncCountrySettings(user);
      })
    );
  }

  loginOwner(credentials: any): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/login-owner`, credentials, { withCredentials: true }))
    );
  }

  sendOtp(email: string): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/auth/send-otp`, { email }, { withCredentials: true }))
    );
  }

  verifyOtp(email: string, otpCode: string): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/auth/verify-otp`, { 
        email, 
        otp_code: otpCode 
      }, { withCredentials: true })),
      switchMap(() => this.prepareCsrf()),
      switchMap(() => this.http.get(`${this.apiUrl}/user`, { withCredentials: true })),
      tap((res: any) => {
        const user = res?.user ?? res;
        this.currentUser.set(user);
        this.syncCountrySettings(user);
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/register`, userData, { withCredentials: true }))
    );
  }

  checkAuth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user`, { withCredentials: true }).pipe(
      tap((res: any) => {
        const user = res?.user ?? res;
        this.currentUser.set(user);
        this.syncCountrySettings(user);
      }),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      })
    );
  }

  checkCurrentUserStatus(): Observable<any> {
    return this.checkAuth();
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
  }

  logoutOwner(): Observable<any> {
    return this.logout();
  }

  performLogout(role: 'admin' | 'owner'): void {
    this.currentUser.set(null);
    this.xsrfToken = null;
    this.clearLocalAuthState();

    const request$ = role === 'owner' ? this.logoutOwner() : this.logout();

    request$.subscribe({
      next: () => this.navigateAfterLogout(role),
      error: () => this.navigateAfterLogout(role),
    });
  }

  private navigateAfterLogout(role: 'admin' | 'owner') {
    this.router.navigate([role === 'owner' ? '/login-owner' : '/login']);
  }

  private clearLocalAuthState() {
    try {
      localStorage.clear();
    } catch {}

    try {
      sessionStorage.clear();
    } catch {}
  }

  forgotPassword(email: string): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/auth/forgot-password`, { email }, { withCredentials: true }))
    );
  }

  verifyResetOtp(email: string, otp: string): Observable<{ message: string; reset_token: string }> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post<{ message: string; reset_token: string }>(
        `${this.apiUrl}/auth/verify-reset-otp`, 
        { email, otp },
        { withCredentials: true }
      ))
    );
  }

  resetPassword(email: string, reset_token: string, password: string): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/auth/reset-password`, {
        email,
        reset_token,
        password
      }, { withCredentials: true }))
    );
  }
}