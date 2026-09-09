import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // 🚀 استخدام رابط Railway API من environment.ts
  private apiUrl = environment.apiUrl; 
  // 🚀 استخراج الرابط الأساسي للسيرفر (Sanctum CSRF Cookie)
  private serverUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  /**
   * 🆕 Reactive signal holding the currently authenticated user payload
   */
  readonly currentUser = signal<any>(null);

  /** In-memory CSRF token for cross-origin requests (vercel.app → railway.app). */
  private xsrfToken: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  getXsrfToken(): string | null {
    return this.xsrfToken;
  }

  /**
   * 1. Establish Sanctum session cookie, then fetch CSRF token as JSON.
   */
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

  /** @deprecated Use prepareCsrf() */
  getCsrfCookie(): Observable<any> {
    return this.prepareCsrf();
  }

  /**
   * 🆕 Synchronous helper: returns current user value from signal.
   */
  getUser(): any {
    return this.currentUser();
  }

  getProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/products`, { withCredentials: true });
  }

  /**
   * 🆕 Get the owner's display name from the stored user payload.
   */
  getOwnerName(): string {
    const user = this.currentUser();
    return user?.name ?? '';
  }

  /**
   * 2. عملية تسجيل دخول الـ Admin
   */
  login(credentials: any): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/login`, credentials, { withCredentials: true })),
      switchMap(() => this.prepareCsrf()),
      switchMap(() => this.http.get(`${this.apiUrl}/user`, { withCredentials: true })),
      tap((res: any) => {
        const user = res?.user ?? res;
        this.currentUser.set(user);
      })
    );
  }

  /**
   * 2b. عملية تسجيل دخول الـ Owner (ترجع الـ Response لمعرفة طلب الـ OTP)
   */
  loginOwner(credentials: any): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/login-owner`, credentials, { withCredentials: true }))
    );
  }

  /**
   * 🔑 2c. إرسال أو إعادة إرسال كود الـ OTP
   */
  sendOtp(email: string): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/auth/send-otp`, { email }, { withCredentials: true }))
    );
  }

  /**
   * 🔑 2d. التثبت من صحة الـ OTP وتسجيل الدخول
   */
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
      })
    );
  }

  /**
   * 2e. عملية تسجيل حساب جديد للـ Owner
   */
  register(userData: any): Observable<any> {
    return this.prepareCsrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/register`, userData, { withCredentials: true }))
    );
  }

  /**
   * 3. التحقق من حالة المستخدم (User Profile)
   */
  checkAuth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user`, { withCredentials: true }).pipe(
      tap((res: any) => {
        const user = res?.user ?? res;
        this.currentUser.set(user);
      }),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      })
    );
  }

  /**
   * 3b. التثبت من حالة الـ Owner والـ Shop متاعو
   */
  checkCurrentUserStatus(): Observable<any> {
    return this.checkAuth();
  }

  /**
   * 4. عملية الخروج
   */
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
  }

  logoutOwner(): Observable<any> {
    return this.logout();
  }

  /**
   * 5. تنفيذ الخروج وتنظيف الـ State
   */
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
forgotPassword(email: string) {
  return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
}

// 2. التحقق من الـ OTP الخاص بإعادة التعيين
verifyResetOtp(email: string, otp: string) {
  return this.http.post<{ message: string; reset_token: string }>(
    `${this.apiUrl}/auth/verify-reset-otp`, 
    { email, otp }
  );
}

// 3. إعادة تعيين كلمة السر الجديدة
resetPassword(email: string, reset_token: string, password: string) {
  return this.http.post(`${this.apiUrl}/auth/reset-password`, {
    email,
    reset_token,
    password
  });
}
}