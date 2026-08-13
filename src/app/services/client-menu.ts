import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientMenuService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // 🚀 ميثود ديناميكية تجيب الـ Subdomain الحالي مالـ URL متاع الـ Browser
  getSubdomain(): string {
    const hostname = window.location.hostname; // تعطينا مثلاً: hamza-shop.localhost أو hamza.mydomain.com
    const parts = hostname.split('.');
    
    // إذا كان فما Subdomain
    if (parts.length > 1 && parts[0] !== 'www') {
      return parts[0];
    }
    return '';
  }

  // ميثود تطلب المنيو مالـ باكند بناءً على الـ Subdomain أو الـ Query parameter
  getMenu(): Observable<any> {
    const subdomain = this.getSubdomain();
    const url = subdomain 
      ? `${this.apiUrl}/client/menu?subdomain=${subdomain}` 
      : `${this.apiUrl}/client/menu`;
    
    console.log('📡 Fetching Menu from Railway:', url);
    return this.http.get(url);
  }

  // ميثود إرسال الطلب للـ باكند
  sendOrder(orderData: any): Observable<any> {
    const subdomain = this.getSubdomain();
    const url = `${this.apiUrl}/client/orders`;
    const payload = subdomain ? { ...orderData, subdomain } : orderData;
    
    console.log('🚀 Sending Order to Railway:', url, 'with data:', payload); 
    
    return this.http.post(url, payload);
  }

  // ─── Live Active Users ──────────────────────────────

  /**
   * Génère (ou réutilise) un identifiant de session stable pour ce navigateur.
   * Persisté dans sessionStorage pour survivre aux rechargements de page.
   */
  getSessionId(): string {
    const KEY = 'cafe_menu_session_id';
    try {
      let id = sessionStorage.getItem(KEY);
      if (!id) {
        id = this.generateUuid();
        sessionStorage.setItem(KEY, id);
      }
      return id;
    } catch {
      return this.generateUuid();
    }
  }

  /** Génère un UUID v4 (crypto.randomUUID avec fallback). */
  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 🟢 Signale au backend que ce visiteur est sur la page menu (heartbeat).
   */
  enterMenu(): Observable<any> {
    const url = `${this.apiUrl}/client/menu/enter`;
    const session_id = this.getSessionId();
    const subdomain = this.getSubdomain();
    return this.http.post(url, { session_id, subdomain });
  }

  /**
   * 🔴 Signale au backend que ce visiteur quitte la page menu.
   */
  leaveMenu(): void {
    const session_id = this.getSessionId();
    const subdomain = this.getSubdomain();
    const url = `${this.apiUrl}/client/menu/leave`;
    
    const body = new Blob([JSON.stringify({ session_id, subdomain })], {
      type: 'application/json',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      this.http.post(url, { session_id, subdomain }).subscribe();
    }
  }
}