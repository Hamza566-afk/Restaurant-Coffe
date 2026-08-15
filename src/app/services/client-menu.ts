import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientMenuService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl; // e.g., https://restaurant-coffe-backend-production.up.railway.app/api

  /**
   * 🚀 استخراج الـ Subdomain أو قراءته من الـ Query Parameter `?shop=xxx`
   */
  getShopIdentifier(customShop?: string | null): string {
    if (customShop) return customShop;

    // 1. البحث في Query Parameter من الرابط
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop') || urlParams.get('subdomain');
    if (shopParam) return shopParam;

    // 2. Fallback: استخراج الـ Subdomain من الـ Hostname
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      return parts[0];
    }

    return '';
  }

  /**
   * جلب المنيو بالـ shop الممرر أو المستخرج تلقائياً
   */
  getMenu(shopSlug?: string | null): Observable<any> {
    const shop = this.getShopIdentifier(shopSlug);
    let params = new HttpParams();
    if (shop) {
      params = params.set('shop', shop).set('subdomain', shop);
    }

    const url = `${this.apiUrl}/client/menu`;
    return this.http.get(url, { params, withCredentials: true });
  }

  /**
   * إرسال الطلب (Order)
   */
  sendOrder(orderData: any, shopSlug?: string | null): Observable<any> {
    const shop = this.getShopIdentifier(shopSlug);
    const url = `${this.apiUrl}/client/orders`;
    const payload = shop ? { ...orderData, shop, subdomain: shop } : orderData;

    return this.http.post(url, payload, { withCredentials: true });
  }

  // ─── Live Active Users ──────────────────────────────

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
   * 🟢 Signale au backend que ce visiteur est sur la page menu
   */
  enterMenu(shopSlug?: string | null): Observable<any> {
    const url = `${this.apiUrl}/client/menu/enter`;
    const session_id = this.getSessionId();
    const shop = this.getShopIdentifier(shopSlug);
    return this.http.post(url, { session_id, shop, subdomain: shop }, { withCredentials: true });
  }

  /**
   * 🔴 Signale au backend que ce visiteur quitte la page menu
   */
  leaveMenu(shopSlug?: string | null): void {
    const session_id = this.getSessionId();
    const shop = this.getShopIdentifier(shopSlug);
    const url = `${this.apiUrl}/client/menu/leave`;

    const body = new Blob([JSON.stringify({ session_id, shop, subdomain: shop })], {
      type: 'application/json',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      this.http.post(url, { session_id, shop, subdomain: shop }, { withCredentials: true }).subscribe();
    }
  }
}