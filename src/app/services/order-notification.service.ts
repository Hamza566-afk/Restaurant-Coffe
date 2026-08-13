import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrderNotificationService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private apiUrl = environment.apiUrl;

  /**
   * Signal holding the number of unread / new (pending) orders.
   * The dashboard sidebar badge and notification icon read this signal.
   */
  readonly unreadOrdersCount = signal<number>(0);

  /**
   * Signal holding the latest order (the most recent "pending" order received).
   * Used for the popup notification and audio cue.
   */
  readonly latestNewOrder = signal<{ id: number; tableNumber?: string; totalPrice?: number } | null>(null);

  /**
   * The last known total of pending orders. Used to detect *new* orders
   * (when the new count exceeds the previous count).
   */
  private previousPendingCount = 0;

  /**
   * Start polling the backend for the pending-orders count.
   * Called once from the Dashboard component's ngOnInit.
   */
  startPolling(): void {
    // Poll every 10 seconds for pending order count
    interval(10000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.fetchPendingOrdersCount()),
        catchError(() => of(0)),               // treat network errors as 0
      )
      .subscribe((count) => {
        const prev = this.previousPendingCount;
        this.previousPendingCount = count;
        this.unreadOrdersCount.set(count);

        // Detect a NEW order (count increased)
        if (prev > 0 && count > prev) {
          this.onNewOrderDetected();
        }
      });
  }

  /** Reset the unread counter after the owner visits/clicks the orders page */
  resetUnreadCount(): void {
    this.unreadOrdersCount.set(0);
    this.latestNewOrder.set(null);
  }

  // ─── Private helpers ────────────────────────────────────────

  /**
   * Calls the backend to get the count of 'pending' orders for the current shop via Railway.
   */
  private fetchPendingOrdersCount(): Promise<number> {
    return new Promise((resolve) => {
      this.http.get<any[]>(`${this.apiUrl}/orders`, { withCredentials: true }).subscribe({
        next: (orders) => {
          const pendingCount = Array.isArray(orders) ? orders.filter(o => o.status === 'pending').length : 0;
          resolve(pendingCount);
        },
        error: () => resolve(0),
      });
    });
  }

  /**
   * Called when a new pending order is detected via polling.
   * Plays a subtle audio notification and updates visual state.
   */
  private onNewOrderDetected(): void {
    // Play audio notification using Web Audio API (no external files needed)
    this.playNotificationSound();

    // Fetch the latest pending order details for the popup from Railway
    this.http.get<any[]>(`${this.apiUrl}/orders`, { withCredentials: true }).subscribe({
      next: (orders) => {
        if (!Array.isArray(orders)) return;
        const pending = orders.filter(o => o.status === 'pending');
        // Sort by id descending to get the most recent one
        pending.sort((a, b) => b.id - a.id);
        const latest = pending[0];
        if (latest) {
          this.latestNewOrder.set({
            id: latest.id,
            tableNumber: latest.table?.table_number?.toString(),
            totalPrice: latest.total_price,
          });
        }
      },
    });
  }

  /**
   * Subtle notification beep using the Web Audio API.
   * No external audio files required — works in all modern browsers.
   */
  private playNotificationSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create a short two-tone "ding" sound
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);       // A5
      oscillator.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.15); // C#6

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch {
      // Audio not supported — silently ignore
    }
  }
}