import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Shop {
  private http = inject(HttpClient);
  // 🚀 ربط المسار بـ environment.apiUrl للتواصل المباشر مع Railway
  private apiUrl = environment.apiUrl;

  getShops() {
    return this.http.get(`${this.apiUrl}/admin/shops`, { withCredentials: true });
  }

  toggleStatus(id: number) {
    return this.http.post(`${this.apiUrl}/admin/shops/${id}/toggle-status`, {}, { withCredentials: true });
  }

  // 🗑️ ميثود حذف القهوة
  deleteShop(id: number) {
    return this.http.delete(`${this.apiUrl}/admin/shops/${id}`, { withCredentials: true });
  }
}