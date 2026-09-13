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
  subtitle: string;
  trendUp: boolean;
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
  protected langService = inject(LanguageService);
  protected t = (key: string): string => this.langService.t(key);

  private dashboardService = inject(DashboardService);
  private destroyRef = inject(DestroyRef);

  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal(false);
  qrActive = signal(true);

  // ─── Computed signals ──────────────────────────────────────────

  statCards = computed<StatCard[]>(() => {
    const s = this.stats();

    const lastProductMod = s?.last_product_updated_at
      ? `${this.t('dash.lastModified')} ${s.last_product_updated_at}`
      : this.t('dash.noProducts');

    const pendingText = `${s?.pending_orders_count ?? 0} ${this.t('dash.pendingCountLabel')}`;

    const liveUsers = s?.live_active_users ?? 0;
    const menuViewsSubtitle = `${liveUsers} ${this.t('dash.onlineClients')}`;

    const lastQrMod = s?.last_qr_updated_at
      ? `${this.t('dash.lastModified')} ${s.last_qr_updated_at}`
      : this.t('dash.noQr');

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

  weeklySales = computed<WeeklySale[]>(() => this.stats()?.weekly_sales ?? []);

  maxWeeklyValue = computed<number>(() => {
    const values = this.weeklySales().map((w) => w.total);
    return values.length ? Math.max(...values) : 0;
  });

  recentOrders = computed<RecentOrder[]>(() => this.stats()?.recent_orders ?? []);

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.checkAuth().subscribe({
      next: (user) => {
        if (user) {
          this.loadDashboardStats();

          interval(2000)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
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

  // ─── Helpers ───────────────────────────────────────────────────

  getStatusLabel(status: string): string {
    const s = status ? status.toLowerCase() : '';
    switch (s) {
      case 'pending':
        return this.t('orders.tabs.pending');
      case 'confirmed':
        return this.t('orders.tabs.confirmed');
      case 'ready':
        return this.t('orders.tabs.ready');
      case 'paid':
      case 'paye':
        return this.t('orders.tabs.paid');
      case 'cancelled':
      case 'annule':
        return this.t('orders.cancelledLabel');
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    const s = status ? status.toLowerCase() : '';
    switch (s) {
      case 'pending':
        return 'badge-warning';
      case 'confirmed':
        return 'badge-info';
      case 'ready':
        return 'badge-neutral';
      case 'paid':
      case 'paye':
        return 'badge-success';
      case 'cancelled':
      case 'annule':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }

  getActivityDotColor(status: string): string {
    const s = status ? status.toLowerCase() : '';
    switch (s) {
      case 'paid':
      case 'paye':
        return 'var(--color-emerald-500)';
      case 'pending':
        return 'var(--color-warning)';
      case 'confirmed':
      case 'ready':
        return 'var(--color-blue-500)';
      case 'cancelled':
      case 'annule':
        return 'var(--color-danger)';
      default:
        return 'var(--color-slate-400)';
    }
  }

  getBarHeight(total: number): number {
    const max = this.maxWeeklyValue();
    if (!max || !total) return 0;
    return Math.max(4, Math.min(100, Math.round((total / max) * 100)));
  }

  getDayLabel(index: number): string {
    const dayKeys = [
      'dash.days.mon',
      'dash.days.tue',
      'dash.days.wed',
      'dash.days.thu',
      'dash.days.fri',
      'dash.days.sat',
      'dash.days.sun'
    ];
    return this.t(dayKeys[index] || '');
  }

  formatCurrency(value: number): string {
    const currencySuffix = this.langService.isRtl() ? ' د.ت' : ' TND';
    return `${(value ?? 0).toFixed(2)}${currencySuffix}`;
  }
}