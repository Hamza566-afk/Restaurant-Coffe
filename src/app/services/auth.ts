import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // 🚀 استخدام رابط Railway API مباشرة من بيئة العمل environment.ts
  private apiUrl = environment.apiUrl; 
  // 🚀 استخراج الرابط الأساسي للسيرفر (Sanctum CSRF Cookie)
  private serverUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  /**
   * 🆕 Reactive signal holding the currently authenticated user payload
   * (from GET /api/user). Populated after login / checkAuth / status polling.
   */
  readonly currentUser = signal<any>(null);

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * 🆕 Synchronous helper: returns the owner's name (or a fallback).
   * Reads directly from the reactive signal state.
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
   * 1. طلب الـ CSRF Cookie من Laravel
   */
  getCsrfCookie(): Observable<any> {
    return this.http.get(`${this.serverUrl}/sanctum/csrf-cookie`, { withCredentials: true });
  }

  /**
   * 2. عملية تسجيل دخول الـ Admin
   */
  login(credentials: any): Observable<any> {
    return this.getCsrfCookie().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/login`, credentials, { withCredentials: true })),
      switchMap(() => this.http.get(`${this.apiUrl}/user`, { withCredentials: true })),
    );
  }

  /**
   * 2b. عملية تسجيل دخول الـ Owner (🚀 محدثة لجلب بيانات الـ Shop والاشتراكات فوراً)
   */
  loginOwner(credentials: any): Observable<any> {
    return this.getCsrfCookie().pipe(
      // 1. نعملوا الـ Post login
      switchMap(() => this.http.post(`${this.apiUrl}/login-owner`, credentials, { withCredentials: true })),
      // 2. نمشيو نجيبوا الـ User Profile بالـ Shop والـ Subscriptions متاعو ديريكت
      switchMap(() => this.http.get(`${this.apiUrl}/user`, { withCredentials: true })),
      // 🆕 Store the user payload into the reactive signal so the sidebar
      //    can display the real owner name without a reload.
      tap((res: any) => {
        const user = res?.user ?? res;
        this.currentUser.set(user);
      })
    );
  }

  /**
   * 2c. عملية تسجيل حساب جديد للـ Owner
   */
  register(userData: any): Observable<any> {
    return this.getCsrfCookie().pipe(
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
    return this.http.get(`${this.apiUrl}/user`, { withCredentials: true }).pipe(
      // 🆕 Keep the reactive user state fresh on every polling cycle
      tap((res: any) => {
        const user = res?.user ?? res;
        this.currentUser.set(user);
      })
    );
  }

  /**
   * 4. عملية الخروج (Admin logout endpoint)
   */
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
  }

  /**
   * 4b. عملية الخروج الخاصة بالأونر
   */
  logoutOwner(): Observable<any> {
    return this.logout();
  }

  /**
   * 5. دالة الخروج
   */
  performLogout(role: 'admin' | 'owner'): void {
    this.currentUser.set(null); // 🆕 Clear the reactive user state on logout
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
}