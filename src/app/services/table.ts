import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Table {
  id: number;
  shop_id: number;
  table_number: number;
  qr_code_url: string;
  server_qr_code_url: string;
  status: 'available' | 'occupied';
  created_at?: string;
  updated_at?: string;
}

/**
 * 🪑 TableService — CRUD for café tables (owner dashboard).
 */
@Injectable({ providedIn: 'root' })
export class TableService {
  private http = inject(HttpClient);
  // 🚀 ربط المسار بـ environment.apiUrl للتواصل المباشر مع Railway
  private apiUrl = `${environment.apiUrl}/admin/tables`;

  /** GET /api/admin/tables */
  getTables(): Observable<{ success: boolean; data: Table[] }> {
    return this.http.get<{ success: boolean; data: Table[] }>(this.apiUrl, {
      withCredentials: true,
    });
  }

  /** POST /api/admin/tables  { number_of_tables | table_number } */
  addTables(payload: Record<string, unknown>): Observable<{ success: boolean; message: string; data?: Table[] }> {
    return this.http.post<{ success: boolean; message: string; data?: Table[] }>(this.apiUrl, payload, {
      withCredentials: true,
    });
  }

  /** DELETE /api/admin/tables/{id} */
  deleteTable(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`, {
      withCredentials: true,
    });
  }
}