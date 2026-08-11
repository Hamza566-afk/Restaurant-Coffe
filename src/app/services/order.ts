import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'paid' | 'cancelled';

// 🚀 زِدنا الـ Interface متع الـ Product اللي جاي مع الـ Eager Loading
export interface Product {
  id: number;
  name: string;
  price: number;
}

// 🚀 زِدنا الـ Interface متع الـ Table باش الـ HTML يقرأ table_number
export interface Table {
  id: number;
  shop_id: number;
  table_number: number;
  status?: string;
}

export interface OrderItem {
  id?: number;
  product_id: number;   // 🚀 زدناها باش يمشي معاها الـ track في الـ HTML
  quantity: number;     // 🚀 بدلناها من qty لـ quantity باش تطابق الـ Laravel داتابيز
  price: number;
  product?: Product;    // 🚀 الحقل الجديد اللي فيه اسم المنتج الحقيقي
}

export interface Order {
  id: number;
  shop_id: number;      // 🚀 أضفنا الحقول متع الـ الباكند
  table_id: number;
  customer?: string;
  table?: Table;        // 🚀 حولناها من string لـ Object Table كامل
  items: OrderItem[];
  total_price: number;  // 🚀 الحقل الحقيقي المبعوث مالـ الباكند
  total?: number;       // 🚀 خليناه اختياري للامان بما أن الـ Controller يعملو في transform
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);

  /**
   * Utilise un chemin relatif /api/orders.
   *
   * En développement, Angular CLI utilise le proxy (proxy.conf.json)
   * pour rediriger /api/* vers le backend Laravel (http://127.0.0.1:8000).
   *
   * En production, un même domaine ou un sous-domaine partagé permet
   * au navigateur d'envoyer automatiquement les cookies de session Sanctum
   * (withCredentials: true).
   */
  private apiUrl = '/api/orders';

  /** GET /api/orders */
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl, { withCredentials: true });
  }

  /** PUT /api/orders/{id}/status */
  updateOrderStatus(id: number, status: OrderStatus): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, { status }, { withCredentials: true });
  }

  /**
   * 🗓️ Clôture de journée — Archive toutes les commandes actives du shop courant.
   * POST /api/orders/cloturer
   */
  cloturerJournee(): Observable<any> {
    return this.http.post(`${this.apiUrl}/cloturer`, {}, { withCredentials: true });
  }
}
