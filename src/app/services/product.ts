import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Product Size Variant Interface ────────────────────────
export interface ProductSize {
  id?: number;
  product_id?: number;
  size_name: string;
  price: number;
}

// ─── Product Interface ──────────────────────────────────
export interface Product {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  price: number;
  is_active: boolean;
  is_featured?: boolean;  // ⭐ Star toggle — featured/most-requested items
  is_hero?: boolean;      // 👑 Crown toggle — single hero banner product
  image_path?: string | null;
  image_url?: string | null; // 🚀 الـ URL الديناميكي الجاي م الـ API
  description?: string | null;
  sizes?: ProductSize[]; // 🆕 Size variants (multi-price)
}

// ─── Product Service ────────────────────────────────────
@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  // 🚀 ربط المسار بـ environment.apiUrl للتواصل المباشر مع Railway
  private apiUrl = `${environment.apiUrl}/admin/products`;

  /** GET /api/admin/products */
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl, { withCredentials: true });
  }

  /** POST /api/admin/products (multipart) */
  addProduct(formData: FormData): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, formData, { withCredentials: true });
  }

  /**
   * POST /api/admin/products/{id} (multipart + _method=PUT)
   */
  updateProduct(id: number, formData: FormData): Observable<Product> {
    if (!formData.has('_method')) {
      formData.append('_method', 'PUT');
    }
    return this.http.post<Product>(`${this.apiUrl}/${id}`, formData, { withCredentials: true });
  }

  /** DELETE /api/admin/products/{id} */
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  /** 🆕 DELETE /api/admin/products/by-category/{categoryId} */
  deleteProductsByCategory(categoryId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/by-category/${categoryId}`, { withCredentials: true });
  }

  /** DELETE /api/admin/products/clear-all */
  clearAllProducts(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/clear-all`, { withCredentials: true });
  }

  /** 🆕 POST /api/admin/products/{id}/generate-image (AI Image Generation) */
  generateProductImage(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/generate-image`, {}, { withCredentials: true });
  }

  /** 🆕 POST /api/admin/products/ai-bulk-generate (Bulk AI Image Generation) */
  bulkGenerateImages(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ai-bulk-generate`, {}, { withCredentials: true });
  }

  /** 🆕 POST /api/admin/products/ai-scan-menu (OCR Scan Menu) */
  scanMenuImage(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ai-scan-menu`, formData, { withCredentials: true });
  }

  /** 🆕 POST /api/admin/products/ai-chat (AI Assistant Chat) */
  aiChat(message: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ai-chat`, { message }, { withCredentials: true });
  }
}