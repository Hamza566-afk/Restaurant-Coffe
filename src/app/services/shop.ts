import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Shop {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getShops() {
    // أضفنا { withCredentials: true }
    return this.http.get(`${this.apiUrl}/admin/shops`, { withCredentials: true });
  }

  toggleStatus(id: number) {
    // أضفنا { withCredentials: true }
    return this.http.post(`${this.apiUrl}/admin/shops/${id}/toggle-status`, {}, { withCredentials: true });
  }

  // 🗑️ ميثود حذف القهوة الجديدة
  deleteShop(id: number) {
    // تبعث طلب DELETE للـ API مع الـ withCredentials للحماية
    return this.http.delete(`${this.apiUrl}/admin/shops/${id}`, { withCredentials: true });
  }
}