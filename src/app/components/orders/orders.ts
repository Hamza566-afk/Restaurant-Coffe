import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { OrderService, OrderStatus } from '../../services/order';
import { LanguageService } from '../../services/language.service';

export interface StatusFlowItem {
  key: OrderStatus;
  label: string;
  icon: string;
  color: string;
}

export interface OrderItem {
  id?: number;
  product_id?: number;
  product_name?: string;
  quantity: number;
  price: number;
  size_name?: string | null;
  notes?: string | null;
  product?: {
    id: number;
    name: string;
    image_path?: string;
  };
}

export interface Order {
  id: number;
  status: OrderStatus | string;
  table_id?: number;
  total_price: number;
  items?: OrderItem[];
  daily_order_number?: number;
  display_number?: string | number | null;
  note?: string | null;
  created_at?: string;
  table?: {
    id: number;
    table_number: number;
  };
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
  private destroyRef = inject(DestroyRef);
  protected languageService = inject(LanguageService);
  protected t = (key: string): string => this.languageService.t(key);

  /** Core reactive lists */
  orders = signal<Order[]>([]);
  historyOrders = signal<Order[]>([]);

  /** UI flags */
  activeTab = signal<'active' | 'history'>('active');
  selectedFilter = signal<string>('all');
  loading = signal(false);

  /** Track order ids that have an in-flight status PUT */
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

  // ─── Computed Signals ──────────────────────────────────────────

  filteredOrders = computed(() => {
    const filter = this.selectedFilter();
    const activeOrders = this.orders().filter(o => 
      !this.isPaid(o.status) && !this.isCancelled(o.status)
    );

    if (filter === 'all') {
      return activeOrders;
    }
    return activeOrders.filter(o => o.status === filter);
  });

  // ─── Lifecycle ────────────────────────────────────────

  ngOnInit(): void {
    this.loadOrders(true);
    this.loadHistoryOrders();

    // Real-Time Polling كل 3 ثواني للطلبات النشطة
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
      next: (data: any[]) => {
        const activeOnly = data.filter(order => 
          !this.isPaid(order.status) && !this.isCancelled(order.status)
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

        this.orders.set(merged as Order[]);
        if (showLoader) this.loading.set(false);
      },
      error: () => {
        this.orders.set([]);
        if (showLoader) this.loading.set(false);
      },
    });
  }

  loadHistoryOrders(): void {
    this.orderService.getOrdersHistory().subscribe({
      next: (data: any[]) => {
        this.historyOrders.set(data as Order[]);
      },
      error: () => this.historyOrders.set([])
    });
  }

  // ─── Helpers for template & Type Safety ──────────────────

  isPaid(status: string | undefined): boolean {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'paid' || s === 'paye';
  }

  isCancelled(status: string | undefined): boolean {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'cancelled' || s === 'annule';
  }

  getOrderCountByStatus(statusKey: string): number {
    const active = this.orders().filter(o => 
      !this.isPaid(o.status) && !this.isCancelled(o.status)
    );

    if (statusKey === 'all') {
      return active.length;
    }
    return active.filter(o => o.status === statusKey).length;
  }

  canProgress(status: string): boolean {
    return !!this.nextStatus[status];
  }

  getNextStatusLabel(status: string): string {
    const next = this.nextStatus[status];
    if (!next) return '';
    const found = this.statusFlow.find(s => s.key === next);
    return found ? found.label : '';
  }

  getStatusInfo(status: string): StatusFlowItem {
    const found = this.statusFlow.find(s => s.key === status);
    if (found) return found;
    return { key: 'cancelled' as OrderStatus, label: 'dash.cancelled', icon: 'fas fa-ban', color: '#ef4444' };
  }

  isRtl(): boolean {
    return document.dir === 'rtl';
  }

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
  }

  switchTab(tab: 'active' | 'history'): void {
    this.activeTab.set(tab);
    if (tab === 'history') {
      this.loadHistoryOrders();
    }
  }

  // ─── Actions ───────────────────────────────

  cloturerJournee(): void {
    this.orderService.cloturerJournee().subscribe({
      next: (res) => {
        alert(res?.message ?? this.t('orders.cloturerSuccess'));
        this.loadOrders(true);
        this.loadHistoryOrders();
      },
      error: () => {
        alert(this.t('orders.cloturerError'));
      }
    });
  }

  progressOrder(order: Order): void {
    const current = String(order.status);
    const next = this.nextStatus[current];
    if (!next) return;
    if (this.inFlight()[order.id]) return;

    this.inFlight.update(state => ({ ...state, [order.id]: true }));

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
        
        if (next === 'paid') {
          this.orders.update(list => list.filter(o => o.id !== order.id));
          this.loadHistoryOrders();
        } else if (res?.order) {
          this.orders.update(list =>
            list.map(o => (o.id === order.id ? { ...o, ...res.order } : o))
          );
        }
      },
      error: () => {
        this.inFlight.update(({ [order.id]: _, ...rest }) => rest);
        this.loadOrders(false);
      },
    });
  }
}