import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'paid' | 'cancelled';

// 🚀 Interface متع الـ Product اللي جاي مع الـ Eager Loading
export interface Product {
  id: number;
  name: string;
  price: number;
}

// 🚀 Interface متع الـ Table باش الـ HTML يقرأ table_number
export interface Table {
  id: number;
  shop_id: number;
  table_number: number;
  status?: string;
}

export interface OrderItem {
  id?: number;
  product_id: number;   // 🚀 track في الـ HTML
  quantity: number;     // 🚀 مطابقة لـ Laravel داتابيز
  price: number;
  product?: Product;    // 🚀 فيه اسم المنتج الحقيقي
}

export interface Order {
  id: number;
  shop_id: number;      // 🚀 حقول الباكند
  table_id: number;
  customer?: string;
  table?: Table;        // 🚀 Object Table كامل
  items: OrderItem[];
  total_price: number;  // 🚀 الحقل الحقيقي المبعوث مالـ الباكند
  total?: number;       // 🚀 اختياري للآمان
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

  // 🚀 ربط المسار بـ environment.apiUrl للتواصل المباشر مع Railway
  private apiUrl = `${environment.apiUrl}/orders`;

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