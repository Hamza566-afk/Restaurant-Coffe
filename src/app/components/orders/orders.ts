import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { OrderService, Order, OrderStatus } from '../../services/order';
import { LanguageService } from '../../services/language.service';

export interface StatusFlowItem {
  key: OrderStatus;
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private orderService = inject(OrderService);
  private destroyRef = inject(DestroyRef); // 🔄 لإيقاف الـ Polling تلقائياً عند تدمير الـ Component
  protected languageService = inject(LanguageService);
  protected t = (key: string): string => this.languageService.t(key);

  /** Core reactive list */
  orders = signal<Order[]>([]);

  /** UI flags */
  selectedFilter = signal<string>('all');
  loading = signal(false);

  /**
   * 🆕 Track order ids that have an in-flight status PUT.
   * Prevents double-clicks AND prevents the 10s polling from
   * re-fetching stale server data that would "revert" an optimistically
   * updated card back to 'pending' (the perceived few-second delay).
   */
  inFlight = signal<Record<number, boolean>>({});

  /** Status flow definition */
  readonly statusFlow: StatusFlowItem[] = [
    { key: 'pending',   label: 'orders.tabs.pending',   icon: 'fas fa-clock',         color: '#f59e0b' },
    { key: 'confirmed', label: 'orders.tabs.confirmed', icon: 'fas fa-check-circle',   color: '#3b82f6' },
    { key: 'ready',     label: 'orders.tabs.ready',     icon: 'fas fa-check-double',  color: '#8b5cf6' },
    { key: 'paid',      label: 'orders.tabs.paid',      icon: 'fas fa-receipt',       color: '#10b981' },
  ];

  /** Allowed status transitions */
  private readonly nextStatus: Record<string, OrderStatus> = {
    pending:   'confirmed',
    confirmed: 'ready',
    ready:     'paid',
  };

  // ─── Computed Signals (أداء أسرع وأقوى للفلترة) ───────────────────

  /** Reactive filtered orders list for the template */
  filteredOrders = computed(() => {
    const filter = this.selectedFilter();
    const currentOrders = this.orders();
    if (filter === 'all') {
      return currentOrders;
    }
    return currentOrders.filter(o => o.status === filter);
  });

  // ─── Lifecycle ────────────────────────────────────────

  ngOnInit(): void {
    // التحميل الأولي للطلبات
    this.loadOrders(true);

    // 🔄 Polling: تحديث تلقائي كل 10 ثواني في الخلفية ليظهر طلب الحريف ديريكت!
    interval(10000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadOrders(false); // false باش ما يظهرش الـ Loader المزعج كل 10 ثواني
      });
  }

  // ─── Data fetching ────────────────────────────────────

  loadOrders(showLoader: boolean = true): void {
    if (showLoader) this.loading.set(true);

    this.orderService.getOrders().subscribe({
      next: (data) => {
        // 🆕 HARDENING: merge server data with any optimistically-updated
        //    in-flight orders so a poll can NEVER revert a card that the
        //    user just confirmed (fixes the "few-second delay" + flicker).
        const active = this.inFlight();
        const hasActive = Object.keys(active).length > 0;
        const merged = hasActive ? data.map(serverOrder => {
          const local = this.orders().find(o => o.id === serverOrder.id);
          if (local && active[serverOrder.id]) {
            // Keep the optimistic status while the PUT is still pending.
            return { ...serverOrder, status: local.status };
          }
          return serverOrder;
        }) : data;

        this.orders.set(merged);
        if (showLoader) this.loading.set(false);
      },
      error: () => {
        this.orders.set([]);
        if (showLoader) this.loading.set(false);
      },
    });
  }

  // ─── Helpers for template (Optimized with Signals) ──

  /** Return count of orders with a given status key, or total if 'all' */
  getOrderCountByStatus(statusKey: string): number {
    if (statusKey === 'all') {
      return this.orders().length;
    }
    return this.orders().filter(o => o.status === statusKey).length;
  }

  /** Whether the order status can be progressed further */
  canProgress(status: OrderStatus): boolean {
    return !!this.nextStatus[status];
  }

  /** Label for the "next status" button */
  getNextStatusLabel(status: OrderStatus): string {
    const next = this.nextStatus[status];
    if (!next) return '';
    const found = this.statusFlow.find(s => s.key === next);
    return found ? found.label : '';
  }

  /** Return display info for a given status: { key, label, icon, color } */
  getStatusInfo(status: OrderStatus): StatusFlowItem {
    const found = this.statusFlow.find(s => s.key === status);
    if (found) return found;
    return { key: 'cancelled', label: 'dash.cancelled', icon: 'fas fa-ban', color: '#ef4444' };
  }

  /** Detect RTL direction for arrow icon */
  isRtl(): boolean {
    return document.dir === 'rtl';
  }

  // ─── Filter setter ────────────────────────────────────

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
  }

  // ─── Status progression ───────────────────────────────

  /**
   * 🗓️ Clôture de journée — Archive toutes les commandes actives.
   * Appelle POST /api/orders/cloturer puis recharge la liste (vide).
   */
cloturerJournee(): void {
    console.log('🗓️ Clôture de journée clicked');
    console.log('📡 Sending POST /api/orders/cloturer request');
    this.orderService.cloturerJournee().subscribe({
      next: (res) => {
        alert(res?.message ?? this.t('orders.cloturerSuccess'));
        this.loadOrders(true);
      },
      error: () => {
        alert(this.t('orders.cloturerError'));
      }
    });
  }

  /** Progress the order to its next status via API with optimistic UI */
  progressOrder(order: Order): void {
    const current = order.status;
    const next = this.nextStatus[current];
    if (!next) return;
    if (this.inFlight()[order.id]) return; // 🆕 prevent double-clicks

    // 🆕 Mark as in-flight (protects against poll-revert + double-click)
    this.inFlight.update(state => ({ ...state, [order.id]: true }));

    // Optimistic update (تحديث فوري للواجهة قبل رد السيرفر لسرعة الاستجابة)
    this.orders.update(list =>
      list.map(o => (o.id === order.id ? { ...o, status: next } : o))
    );

    this.orderService.updateOrderStatus(order.id, next).subscribe({
      next: (res) => {
        // Success → clear in-flight flag and sync the authoritative server order
        this.inFlight.update(({ [order.id]: _, ...rest }) => rest);
        if (res?.order) {
          this.orders.update(list =>
            list.map(o => (o.id === order.id ? { ...o, ...res.order } : o))
          );
        }
      },
      error: () => {
        // Rollback on failure (إلغاء التحديث في حال فشل السيرفر)
        this.inFlight.update(({ [order.id]: _, ...rest }) => rest);
        this.orders.update(list =>
          list.map(o => (o.id === order.id ? { ...o, status: current } : o))
        );
      },
    });
  }
}
