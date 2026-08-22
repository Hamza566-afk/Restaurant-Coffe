import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'paid' | 'cancelled';

export interface Product {
  id: number;
  name: string;
  price: number;
  image_path?: string;
}

export interface Table {
  id: number;
  shop_id: number;
  table_number: number;
  status?: string;
}

export interface OrderItem {
  id?: number;
  product_id: number;
  quantity: number;
  price: number;
  size_name?: string | null;
  notes?: string | null; // 📝 تم إضافة الملاحظة لحل أخطاء الـ Template
  product?: Product;
}

export interface Order {
  id: number;
  shop_id: number;
  table_id: number;
  customer?: string;
  display_number?: string;
  daily_order_number?: number;
  queue_position?: number;
  table?: Table;
  items: OrderItem[];
  total_price: number;
  total?: number;
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
  private zone = inject(NgZone);

  private apiUrl = `${environment.apiUrl}/orders`;

  /** 📋 جلب الطلبات النشطة الحالية للأدمن */
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl, { withCredentials: true });
  }

  /** 📜 جلب سجل الطلبات السابقة (Historique) */
  getOrdersHistory(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/history`, { withCredentials: true });
  }

  /** 🔄 تحديث حالة الطلب من طرف الأدمن */
  updateOrderStatus(id: number, status: OrderStatus): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, { status }, { withCredentials: true });
  }

  /** 🔒 إغلاق اليومية (Clôturer la journée) */
  cloturerJournee(): Observable<any> {
    return this.http.post(`${this.apiUrl}/cloturer`, {}, { withCredentials: true });
  }

  /** 📡 Stream حيني للـ Admin Dashboard لمتابعة جميع الطلبات المباشرة */
  getOrdersStream(): Observable<Order[]> {
    return new Observable(observer => {
      const url = `${this.apiUrl}/stream`;
      const eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          try {
            const data = JSON.parse(event.data);
            observer.next(data);
          } catch (err) {
            console.error('Error parsing admin orders SSE stream', err);
          }
        });
      };

      eventSource.onerror = (error) => {
        this.zone.run(() => {
          observer.error(error);
          eventSource.close();
        });
      };

      return () => eventSource.close();
    });
  }

  /** 🚀 Real-time SSE Stream لمتابعة طلب واحد (خاص بالكليون) */
  trackOrder(orderId: number, shopQueryParam: string = ''): Observable<any> {
    return new Observable(observer => {
      const baseUrl = environment.apiUrl.replace(/\/orders\/?$/, '');
      const url = `${baseUrl}/client/orders/${orderId}/track${shopQueryParam ? '?shop=' + shopQueryParam : ''}`;
      
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          try {
            const data = JSON.parse(event.data);
            observer.next(data);
          } catch (err) {
            console.error('Error parsing client tracking SSE stream', err);
          }
        });
      };

      eventSource.onerror = (error) => {
        this.zone.run(() => {
          observer.error(error);
          eventSource.close();
        });
      };

      return () => eventSource.close();
    });
  }

  /** ❌ إلغاء الطلب من طرف الكليون */
  cancelClientOrder(orderId: number, shopQueryParam: string = ''): Observable<any> {
    const baseUrl = environment.apiUrl.replace(/\/orders\/?$/, '');
    const url = `${baseUrl}/client/orders/${orderId}${shopQueryParam ? '?shop=' + shopQueryParam : ''}`;
    return this.http.delete(url);
  }
}