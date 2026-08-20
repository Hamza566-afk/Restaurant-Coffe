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
    // تصفية الطلبات النشطة فقط (تستبعد المكتملة والملغاة فوراً)
    const activeOrders = this.orders().filter(o => 
      !['paid', 'paye', 'cancelled', 'annule'].includes(o.status?.toLowerCase())
    );

    if (filter === 'all') {
      return activeOrders;
    }
    return activeOrders.filter(o => o.status === filter);
  });

  // ─── Lifecycle ────────────────────────────────────────

  ngOnInit(): void {
    // التحميل الأولي للطلبات
    this.loadOrders(true);

    // ⚡ Real-Time Polling: تحديث تلقائي وسريع كل 3 ثواني للتحيين الفوري للطلبات والنوبة!
    interval(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadOrders(false);
      });
  }

  // ─── Data fetching ────────────────────────────────────

  loadOrders(showLoader: boolean = true): void {
    if (showLoader) this.loading.set(true);

    this.orderService.getOrders().subscribe({
      next: (data) => {
        // فلترة الطلبات المكتملة فوراً لمنع ظهورها في الواجهة
        const activeOnly = data.filter(order => 
          !['paid', 'paye', 'cancelled', 'annule'].includes(order.status?.toLowerCase())
        );

        const active = this.inFlight();
        const hasActive = Object.keys(active).length > 0;
        
        const merged = hasActive ? activeOnly.map(serverOrder => {
          const local = this.orders().find(o => o.id === serverOrder.id);
          if (local && active[serverOrder.id]) {
            return { ...serverOrder, status: local.status };
          }
          return serverOrder;
        }) : activeOnly;

        this.orders.set(merged);
        if (showLoader) this.loading.set(false);
      },
      error: () => {
        this.orders.set([]);
        if (showLoader) this.loading.set(false);
      },
    });
  }

  // ─── Helpers for template ──────────────────

  getOrderCountByStatus(statusKey: string): number {
    const active = this.orders().filter(o => 
      !['paid', 'paye', 'cancelled', 'annule'].includes(o.status?.toLowerCase())
    );

    if (statusKey === 'all') {
      return active.length;
    }
    return active.filter(o => o.status === statusKey).length;
  }

  canProgress(status: OrderStatus): boolean {
    return !!this.nextStatus[status];
  }

  getNextStatusLabel(status: OrderStatus): string {
    const next = this.nextStatus[status];
    if (!next) return '';
    const found = this.statusFlow.find(s => s.key === next);
    return found ? found.label : '';
  }

  getStatusInfo(status: OrderStatus): StatusFlowItem {
    const found = this.statusFlow.find(s => s.key === status);
    if (found) return found;
    return { key: 'cancelled', label: 'dash.cancelled', icon: 'fas fa-ban', color: '#ef4444' };
  }

  isRtl(): boolean {
    return document.dir === 'rtl';
  }

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
  }

  // ─── Actions ───────────────────────────────

  cloturerJournee(): void {
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
    if (this.inFlight()[order.id]) return;

    this.inFlight.update(state => ({ ...state, [order.id]: true }));

    // 🚀 إذا أصبحت الحالة 'paid' قم بحذف الطلب فوراً من الواجهة بتحديث آلي
    if (next === 'paid') {
      this.orders.update(list => list.filter(o => o.id !== order.id));
    } else {
      this.orders.update(list =>
        list.map(o => (o.id === order.id ? { ...o, status: next } : o))
      );
    }

    this.orderService.updateOrderStatus(order.id, next).subscribe({
      next: (res) => {
        this.inFlight.update(({ [order.id]: _, ...rest }) => rest);
        
        // إذا كان الطلب اكتمل (paid)، نتأكد من حذفه من القائمة المحلية
        if (next === 'paid') {
          this.orders.update(list => list.filter(o => o.id !== order.id));
        } else if (res?.order) {
          this.orders.update(list =>
            list.map(o => (o.id === order.id ? { ...o, ...res.order } : o))
          );
        }
      },
      error: () => {
        this.inFlight.update(({ [order.id]: _, ...rest }) => rest);
        // إعادة الطلب للواجهة في حالة وجود خطأ في السيرفر
        this.loadOrders(false);
      },
    });
  }
}