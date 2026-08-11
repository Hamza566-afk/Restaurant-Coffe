import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AuthService } from '../../services/auth';
import { LanguageService } from '../../services/language.service';
import { DashboardService, DashboardStats, RecentOrder, WeeklySale } from '../../services/dashboard.service';

interface StatCard {
  titleKey: string;
  value: number;
  icon: string;
  subtitle: string; // Texte dynamique affiché dans le pied de la carte
  trendUp: boolean; // Contrôle l'icône flèche (haut / bas)
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements OnInit {
  // 🆕 Inject the language service for reactive translations
  protected langService = inject(LanguageService);
  protected t = (key: string): string => this.langService.t(key);

  // 🆕 Inject the dashboard service (real API)
  private dashboardService = inject(DashboardService);

  // 🆕 Auto-cleanup of the polling subscription on destroy
  private destroyRef = inject(DestroyRef);

  // 🆕 Reactive state — null until the API responds
  stats = signal<DashboardStats | null>(null);

  // 🆕 Loading / error flags
  loading = signal(true);
  error = signal(false);

  // 🆕 QR active flag (kept from original UI)
  qrActive = signal(true);

  // ─── Computed signals derived from API data (graceful fallbacks) ──

/** Stat cards bound to real API values + dynamic subtitles. */
  statCards = computed<StatCard[]>(() => {
    const s = this.stats();

    // Card 1 — Total produits : dernière modification d'un produit
    const lastProductMod = s?.last_product_updated_at
      ? `Dernière modif: ${s.last_product_updated_at}`
      : 'Aucun produit';

    // Card 2 — Commandes actives : nombre réel de commandes en attente
    const pendingText = `${s?.pending_orders_count ?? 0} en attente`;

    // Card 3 — Visites du menu : nombre de visiteurs actifs en ce moment
    const liveUsers = s?.live_active_users ?? 0;
    const menuViewsSubtitle = `${liveUsers} clients en ligne en ce moment`;

    // Card 4 — Statut du QR : dernière génération d'une table / QR
    const lastQrMod = s?.last_qr_updated_at
      ? `Dernière modif: ${s.last_qr_updated_at}`
      : 'Aucun QR généré';

    return [
      {
        titleKey: 'dash.totalProducts',
        value: s?.total_products ?? 0,
        icon: 'fas fa-cube',
        subtitle: lastProductMod,
        trendUp: true,
        color: 'emerald',
      },
      {
        titleKey: 'dash.activeOrders',
        value: s?.active_orders ?? 0,
        icon: 'fas fa-receipt',
        subtitle: pendingText,
        trendUp: false,
        color: 'blue',
      },
      {
        titleKey: 'dash.menuViews',
        value: s?.menu_views ?? 0,
        icon: 'fas fa-eye',
        subtitle: menuViewsSubtitle,
        trendUp: true,
        color: 'purple',
      },
      {
        titleKey: 'dash.qrStatus',
        value: s?.qr_codes_count ?? 0,
        icon: 'fas fa-qrcode',
        subtitle: lastQrMod,
        trendUp: true,
        color: 'amber',
      },
    ];
  });

  /** Weekly sales array for the chart. */
  weeklySales = computed<WeeklySale[]>(() => this.stats()?.weekly_sales ?? []);

  /** Max value for chart bar scaling. */
  maxWeeklyValue = computed<number>(() => {
    const values = this.weeklySales().map((w) => w.total);
    return values.length ? Math.max(...values) : 0;
  });

  /** Recent orders for the activity table. */
  recentOrders = computed<RecentOrder[]>(() => this.stats()?.recent_orders ?? []);

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Authenticate first, then load dashboard stats.
    this.authService.checkAuth().subscribe({
      next: (user) => {
        if (user) {
          console.log('Owner user:', user);
          this.loadDashboardStats();

          // ⚡ Auto-refresh (polling) toutes les 2 secondes pour un suivi
          //    quasi-instantané des vues du menu et des clients en ligne.
          interval(2000)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              console.log('🔄 Polling dashboard stats...');
              this.loadDashboardStats();
            });
        }
      },
      error: (err) => {
        console.error('Auth check failed:', err);
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  /** Fetch real stats from the API. */
  loadDashboardStats(): void {
    this.error.set(false);

    this.dashboardService.getStats().subscribe({
      next: (res) => {
        if (res?.success) {
          this.stats.set(res.data);
        } else {
          this.error.set(true);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Dashboard stats error:', err);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  // ─── Helpers for template ─────────────────────────────

  /** Map backend status → French label. */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmée';
      case 'ready':
        return 'Prête';
      case 'paid':
        return 'Payée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  }

  /** Map backend status → badge CSS class. */
  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'confirmed':
        return 'badge-info';
      case 'ready':
        return 'badge-neutral';
      case 'paid':
        return 'badge-success';
      case 'cancelled':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }

  /** Clean dot color for the activity row. */
  getActivityDotColor(status: string): string {
    switch (status) {
      case 'paid':
        return 'var(--color-emerald-500)';
      case 'pending':
        return 'var(--color-warning)';
      case 'confirmed':
      case 'ready':
        return 'var(--color-blue-500)';
      case 'cancelled':
        return 'var(--color-danger)';
      default:
        return 'var(--color-slate-400)';
    }
  }

/** Bar height (percentage) for chart — proportional to max.
   *  0 → barre invisible (0%), sinon hauteur proportionnelle. */
  getBarHeight(total: number): number {
    const max = this.maxWeeklyValue();
    if (!max || !total) return 0;
    return Math.max(4, Math.min(100, Math.round((total / max) * 100)));
  }

  /** Short day label for chart (French). */
  getDayLabel(index: number): string {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return days[index] ?? '';
  }

  /** Format a currency amount in French locale. */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'TND',
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }
}
