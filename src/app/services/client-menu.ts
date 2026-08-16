import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientMenuService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * 🚀 استخراج الـ Query Parameters الصحيحة من الرابط (?shop_id=X&table=Y)
   */
  getShopParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // يقرأ shop_id أو shop
    const shopId = urlParams.get('shop_id') || urlParams.get('shop') || urlParams.get('subdomain');
    // يقرأ table أو table_id
    const table = urlParams.get('table') || urlParams.get('table_id');

    return {
      shop_id: shopId || '',
      table: table || ''
    };
  }

  /**
   * جلب المنيو بالـ shop_id و table الصحيحين
   */
  getMenu(customShop?: string | null): Observable<any> {
    const paramsData = this.getShopParams();
    let params = new HttpParams();

    const shopId = customShop || paramsData.shop_id;
    if (shopId) {
      params = params.set('shop_id', shopId);
    }
    if (paramsData.table) {
      params = params.set('table', paramsData.table);
    }

    const url = `${this.apiUrl}/client/menu`;
    return this.http.get(url, { params, withCredentials: true });
  }

  /**
   * إرسال الطلب (Order)
   */
  sendOrder(orderData: any, customShop?: string | null): Observable<any> {
    const paramsData = this.getShopParams();
    const shopId = customShop || paramsData.shop_id;

    const url = `${this.apiUrl}/client/orders`;
    const payload = {
      ...orderData,
      shop_id: shopId,
      table: paramsData.table
    };

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
  enterMenu(customShop?: string | null): Observable<any> {
    const url = `${this.apiUrl}/client/menu/enter`;
    const session_id = this.getSessionId();
    const paramsData = this.getShopParams();
    const shopId = customShop || paramsData.shop_id;

    return this.http.post(
      url, 
      { session_id, shop_id: shopId, table: paramsData.table }, 
      { withCredentials: true }
    );
  }

  /**
   * 🔴 Signale au backend que ce visiteur quitte la page menu
   */
  leaveMenu(customShop?: string | null): void {
    const session_id = this.getSessionId();
    const paramsData = this.getShopParams();
    const shopId = customShop || paramsData.shop_id;
    const url = `${this.apiUrl}/client/menu/leave`;

    const payload = { session_id, shop_id: shopId, table: paramsData.table };

    const body = new Blob([JSON.stringify(payload)], {
      type: 'application/json',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      this.http.post(url, payload, { withCredentials: true }).subscribe();
    }
  }
}