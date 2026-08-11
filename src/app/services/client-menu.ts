import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientMenuService {
  private http = inject(HttpClient);

  // 🚀 ميثود ديناميكية ومحمية تجيب الـ Subdomain الحالي مالـ URL متاع الـ Browser
  getSubdomain(): string {
    const hostname = window.location.hostname; // تعطينا مثلاً: hamza-shop.localhost
    const parts = hostname.split('.');
    
    // إذا كان فما Subdomain (طول الـ array أكبر من 1 في الـ local)
    if (parts.length > 1 && parts[0] !== 'www') {
      return parts[0]; // ترجع "hamza-shop"
    }
    return '';
  }

  // ميثود تطلب المنيو مالـ باكند بناءً على الـ Subdomain
  getMenu(): Observable<any> {
    const subdomain = this.getSubdomain();
    const url = `http://${subdomain}.localhost:8000/api/client/menu`;
    
    console.log('📡 Fetching Menu from:', url); // 📝 للـ Debugging
    return this.http.get(url);
  }

// ميثود إرسال الطلب للـ باكند
  sendOrder(orderData: any): Observable<any> {
    const subdomain = this.getSubdomain();
    const url = `http://${subdomain}.localhost:8000/api/client/orders`;
    
    // 🔥 هذا الـ Log باش يوريك الـ URL الحقيقي في الـ Console قبل ما يبعث
    console.log('🚀 Sending Order to:', url, 'with data:', orderData); 
    
    return this.http.post(url, orderData);
  }

  // ─── Live Active Users (Card 3) ──────────────────────────────

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
    // Fallback simple
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /** Construction de l'URL de base du shop (même subdomain, port 8000). */
  private getShopBaseUrl(): string {
    const subdomain = this.getSubdomain();
    return `http://${subdomain}.localhost:8000`;
  }

  /**
   * 🟢 Signale au backend que ce visiteur est sur la page menu (heartbeat).
   * Appelé à l'ouverture puis périodiquement pour garder la session active.
   */
  enterMenu(): Observable<any> {
    const url = `${this.getShopBaseUrl()}/api/client/menu/enter`;
    const session_id = this.getSessionId();
    return this.http.post(url, { session_id });
  }

  /**
   * 🔴 Signale au backend que ce visiteur quitte la page menu.
   * Appelé sur `beforeunload` / ngOnDestroy pour décrémenter le compteur.
   */
  leaveMenu(): void {
    const session_id = this.getSessionId();
    const url = `${this.getShopBaseUrl()}/api/client/menu/leave`;
    // sendBeacon : fiable même pendant la fermeture de l'onglet
    const body = new Blob([JSON.stringify({ session_id })], {
      type: 'application/json',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      this.http.post(url, { session_id }).subscribe();
    }
  }
}
