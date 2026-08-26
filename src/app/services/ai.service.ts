import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ParsedProduct {
  name: string;
  price: number;
  category: string;
  image_url?: string;
  selected?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ai`;

  /** توليد صورة منتج بالـ AI */
  generateProductImage(name: string): Observable<{ success: boolean; image_url: string }> {
    return this.http.post<{ success: boolean; image_url: string }>(`${this.apiUrl}/generate-image`, { name });
  }

  /** استخراج المينيو من صورة ورقة */
  parseMenu(imageFile: File): Observable<{ success: boolean; products: ParsedProduct[] }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    return this.http.post<{ success: boolean; products: ParsedProduct[] }>(`${this.apiUrl}/parse-menu`, formData);
  }

  /** المحادثة مع المساعد الذكي */
  chat(message: string, context?: any): Observable<{ success: boolean; reply: string }> {
    return this.http.post<{ success: boolean; reply: string }>(`${this.apiUrl}/chat`, { message, context });
  }
}