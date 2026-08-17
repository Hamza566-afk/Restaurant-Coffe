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
   * 🚀 Read shop slug / id and table number from the current route query string.
   */
  getRouteContext(customShop?: string | null): { shop: string; tableNumber: number | null } {
    const urlParams = new URLSearchParams(window.location.search);
    const shop =
      customShop ||
      urlParams.get('shop') ||
      urlParams.get('subdomain') ||
      urlParams.get('shop_id') ||
      '';

    const tableRaw = urlParams.get('table') || urlParams.get('table_id');
    const tableNumber = tableRaw ? +tableRaw : null;

    return { shop, tableNumber: tableNumber && !Number.isNaN(tableNumber) ? tableNumber : null };
  }

  /**
   * 🚀 استخراج الـ Subdomain أو قراءته من الـ Query Parameter `?shop=xxx`
   */
  getShopIdentifier(customShop?: string | null): string {
    return this.getRouteContext(customShop).shop;
  }

  private buildShopParams(shop: string): HttpParams {
    let params = new HttpParams();
    if (!shop) {
      return params;
    }

    if (/^\d+$/.test(shop)) {
      return params.set('shop_id', shop);
    }

    return params.set('shop', shop).set('subdomain', shop);
  }

  /**
   * جلب المنيو بالـ shop الممرر أو المستخرج تلقائياً
   */
  getMenu(shopSlug?: string | null): Observable<any> {
    const shop = this.getShopIdentifier(shopSlug);
    const params = this.buildShopParams(shop);

    const url = `${this.apiUrl}/client/menu`;
    return this.http.get(url, { params, withCredentials: true });
  }

  /**
   * إرسال الطلب (Order)
   */
  sendOrder(orderData: any, shopSlug?: string | null): Observable<any> {
    const shop = this.getShopIdentifier(shopSlug);
    const url = `${this.apiUrl}/client/orders`;
    const shopFields = /^\d+$/.test(shop)
      ? { shop_id: +shop }
      : shop
        ? { shop, subdomain: shop }
        : {};
    const payload = { ...orderData, ...shopFields };

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
    const shopFields = /^\d+$/.test(shop)
      ? { shop_id: +shop }
      : { shop, subdomain: shop };

    return this.http.post(url, { session_id, ...shopFields }, { withCredentials: true });
  }

  /**
   * 🔴 Signale au backend que ce visiteur quitte la page menu
   */
  leaveMenu(shopSlug?: string | null): void {
    const session_id = this.getSessionId();
    const shop = this.getShopIdentifier(shopSlug);
    const shopFields = /^\d+$/.test(shop)
      ? { shop_id: +shop }
      : { shop, subdomain: shop };
    const url = `${this.apiUrl}/client/menu/leave`;

    const body = new Blob([JSON.stringify({ session_id, ...shopFields })], {
      type: 'application/json',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      this.http.post(url, { session_id, ...shopFields }, { withCredentials: true }).subscribe();
    }
  }
}