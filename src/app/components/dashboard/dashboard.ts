import { Component, signal, OnInit, OnDestroy, computed, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth';
import { OrderNotificationService } from '../../services/order-notification.service';
import { LanguageService } from '../../services/language.service';
import { CommonModule } from '@angular/common';
import { Subscription, timer, filter } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
  badgeCount?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = signal(false);

  // 🆕 Inject the notification service
  protected notifService = inject(OrderNotificationService);
  // 🆕 Inject the language service for i18n + RTL/LTR switching
  protected langService = inject(LanguageService);

  // 🆕 Reactive owner name — updated live from AuthService.currentUser signal
  protected readonly ownerName = computed<string>(() => {
    const user = this.auth.getUser();
    return user?.name ?? '';
  });

  protected readonly currentUser = computed<any>(() => this.auth.getUser());

  // 🚀 Reactive shop (with logo_url & name) — read from the authenticated user payload
  protected readonly shop = computed<any>(() => this.auth.getUser()?.shop ?? null);

  // 🚀 Fallback flag: when the logo <img> fails to load, revert to the green cup icon
  protected readonly logoError = signal<boolean>(false);

  // المتغيّر اللي يشيل الـ التثبت الدّوري
  private statusSubscription!: Subscription;
  private routerSubscription!: Subscription;

  constructor(private auth: AuthService, private router: Router) {}

  // دالة الـ ngOnInit تخدم أول ما يتحل الـ Dashboard
  ngOnInit(): void {
    // 🚀 timer(0, 30000) يثبت فوراً (في الـ 0ms) ومن بعد يعاود كل 30 ثانية أوتوماتيكياً
    this.statusSubscription = timer(0, 30000).pipe(
      switchMap(() => this.auth.checkCurrentUserStatus())
    ).subscribe({
      next: (res) => {
        if (res && res.shop) {
          // 1. إذا الـ Admin عمل ديسأكتيف للحساب
          if (!res.shop.is_active) {
            // نثبتوا هل عنده اشتراكات سابقة في الجدول أو لا
            const hasSubscriptions = res.shop.subscriptions && res.shop.subscriptions.length > 0;

            if (hasSubscriptions) {
              // كان يخدم وعنده اشتراك قديم ووقف -> لصفحة انتهاء الاشتراك
              this.router.navigate(['/subscription-expired']);
            } else {
              // حساب جديد عمره ما تفعّل -> لصفحة الانتظار
              this.router.navigate(['/waiting-approval']);
            }
          }
        }
      },
      error: () => {
        this.auth.performLogout('owner');
      }
    });

    // 🆕 Start real-time order polling for notifications
    this.notifService.startPolling();

    // 🆕 Reset unread count when user navigates to the orders page
    this.routerSubscription = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        if (event.urlAfterRedirects.includes('/dashboard/orders')) {
          this.notifService.resetUnreadCount();
        }
      });
  }

  // دالة الـ ngOnDestroy تخدم كيف الـ Owner يخرج من الـ Dashboard أو يتعملو redirection
  ngOnDestroy(): void {
    // ننظفو الـ Subscription باش الـ عداد يقف وما عادش يطلب الـ API في الفارغ
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }

  navigateToOrders(): void {
    this.notifService.resetUnreadCount();
    this.router.navigate(['/dashboard/orders']);
  }

logout(): void {
    this.auth.performLogout('owner');
  }

  /** 🚀 Called when the shop logo <img> fails to load → fall back to the green cup icon */
  onLogoError(): void {
    this.logoError.set(true);
  }

  getCurrentDate(): string {
    const now = new Date();
    const locale = this.langService.lang() === 'ar' ? 'ar-TN' : this.langService.lang() === 'fr' ? 'fr-FR' : 'en-US';
    return now.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // 🆕 Navigation items with computed reactive badge
  navItems = computed<NavItem[]>(() => [
    { path: 'home', icon: 'fas fa-house-chimney', labelKey: 'nav.home' },
    {
      path: 'orders',
      icon: 'fas fa-receipt',
      labelKey: 'nav.orders',
      badgeCount: this.notifService.unreadOrdersCount(),
    },
    { path: 'products', icon: 'fas fa-cube', labelKey: 'nav.products' },
    { path: 'qr-code', icon: 'fas fa-qrcode', labelKey: 'nav.qrCode' },
  ]);

  // 🆕 i18n: reactive translate helper (re-renders whenever lang changes)
  protected t = (key: string): string => this.langService.t(key);

  // 🆕 Language dropdown open/close state
  protected langOpen = signal(false);

  /** Toggle the language dropdown (called from template) */
  toggleLangDropdown(): void {
    this.langOpen.update(v => !v);
  }

  /** Switch language + close dropdown */
  setLanguage(lang: 'ar' | 'fr' | 'en'): void {
    this.langService.setLanguage(lang);
    this.langOpen.set(false);
  }
}
