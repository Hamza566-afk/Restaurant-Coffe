import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'paid' | 'cancelled';

export interface Product {
  id: number;
  name: string;
  price: number;
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
  product?: Product;
}

export interface Order {
  id: number;
  shop_id: number;
  table_id: number;
  customer?: string;
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

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl, { withCredentials: true });
  }

  updateOrderStatus(id: number, status: OrderStatus): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, { status }, { withCredentials: true });
  }

  cloturerJournee(): Observable<any> {
    return this.http.post(`${this.apiUrl}/cloturer`, {}, { withCredentials: true });
  }

  /** 🚀 Real-time SSE Stream */
  trackOrder(orderId: number, shopQueryParam: string = ''): Observable<any> {
    return new Observable(observer => {
      const baseUrl = environment.apiUrl.replace(/\/orders\/?$/, '');
      const url = `${baseUrl}/client/orders/${orderId}/track${shopQueryParam ? '?shop=' + shopQueryParam : ''}`;
      
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          const data = JSON.parse(event.data);
          observer.next(data);
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