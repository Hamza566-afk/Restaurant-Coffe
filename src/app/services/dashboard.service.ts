import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ─── Interfaces métier pour le tableau de bord ─────────────────

/** Une entrée de vente hebdomadaire (par jour). */
export interface WeeklySale {
  date: string;   // ex: "2026-08-01"
  total: number;  // ex: 120.5
}

/** Une commande récente affichée dans le tableau "Activité récente". */
export interface RecentOrder {
  id: number;
  table_number: number | null;
  items_count: number;
  products: string;           // résumé des noms de produits, ex: "Pizza x2, Spaghetti"
  total_price: number;
  status: string;             // pending | confirmed | ready | paid | cancelled
  created_at: string | null;  // ex: "01/08/2026 14:30"
}

/** Payload complet retourné par GET /api/dashboard/stats. */
export interface DashboardStats {
  total_products: number;
  last_product_updated_at: string | null; // "DD/MM/YYYY HH:mm"
  active_orders: number;
  pending_orders_count: number;
  menu_views: number;
  live_active_users: number;
  menu_views_percentage: number;
  qr_codes_count: number;
  last_qr_updated_at: string | null; // "DD/MM/YYYY HH:mm"
  weekly_sales: WeeklySale[];
  recent_orders: RecentOrder[];
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = '/api/dashboard/stats';

  /**
   * GET /api/dashboard/stats
   * Récupère les statistiques du tableau de bord, scopées au shop courant.
   */
  getStats(): Observable<{ success: boolean; data: DashboardStats }> {
    return this.http.get<{ success: boolean; data: DashboardStats }>(this.apiUrl, {
      withCredentials: true,
    });
  }
}
