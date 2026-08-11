import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
  shop_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = '/api/admin/categories';

  /** GET /api/admin/categories */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl, { withCredentials: true });
  }

/** POST /api/admin/categories */
  addCategory(name: string): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, { name }, { withCredentials: true });
  }

  /** PUT /api/admin/categories/{id} */
  updateCategory(id: number, name: string): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, { name }, { withCredentials: true });
  }

  /** DELETE /api/admin/categories/{id} */
  deleteCategory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }
}