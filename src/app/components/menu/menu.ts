import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router'; // 🚀 1. استدعاء الـ ActivatedRoute لقراءة الـ URL
import { ClientMenuService } from '../../services/client-menu';

interface CartItem {
  product: any;
  quantity: number;
  size?: string | null;   // 🆕 Flex: actual size_name from backend (or null when no sizes)
  unitPrice: number;      // 🆕 The exact unit price used (size price OR product price)
  totalPrice: number;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css']
})
export class MenuComponent implements OnInit, OnDestroy {
  menuData: any = null;
  loading: boolean = true;
  errorMessage: string = '';

  // 🚀 التحكم في الصفحات (main | details | cart | success)
  currentView: 'main' | 'details' | 'cart' | 'success' = 'main';

  // 🚀 الحقول الخاصة بالبحث والفلترة
  selectedCategoryId: number | null = null;
  searchQuery: string = '';

  // 🆕 Favorites filter flag (bottom nav) — shows only featured products
  showFavorites: boolean = false;

  // 🆕 Logo error fallback flag — when shop logo fails to load, use the green cup icon
  logoError: boolean = false;

// 🚀 الحقول الخاصة بالمنتج المحدد (Details View)
  selectedProduct: any = null;
  selectedSize: string | null = null;   // 🆕 Actual size_name from backend (null when no sizes)
  selectedPrice: number = 0;            // 🆕 The exact unit price (size price OR product price)
  hasSizes: boolean = false;            // 🆕 Whether the product has size variants
  detailQuantity: number = 1;

  // 🚀 إدارة السلة
  cart: CartItem[] = [];

  // 🚀 حقل لتخزين رقم الطاولة القادم من الـ QR Code
  tableNumber: number | null = null;

 // 1. نحّي السطر القديم هذا:
// backendUrl = 'http://hamza-shop.localhost:8000';

// 2. حط في بلاصتو السكريبت الديناميكي هذا:
    backendUrl: string = (() => {
      const hostname = window.location.hostname; // باش ياخو 'localhost' أو 'hamza-shop.localhost' أوتوماتيكياً
      return `http://${hostname}:8000`; // يركب عليها بورت الـ Laravel ديريكت
    })();


  // 🚀 2. نزيدو الـ ActivatedRoute في الـ Constructor
  constructor(
    private menuService: ClientMenuService,
    private route: ActivatedRoute
  ) {}

// 🟢🔴 Live presence tracking (Card 3)
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // 🚀 3. قراءة الـ table_id من الـ URL (مثال: ?table_id=1)
    this.route.queryParams.subscribe(params => {
      if (params['table_id']) {
        this.tableNumber = +params['table_id']; // الـ + لتحويل النص إلى رقم
      }
    });

    this.menuService.getMenu().subscribe({
      next: (res) => {
        this.menuData = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load menu', err);
        this.errorMessage = 'المحل غير موجود أو تم إيقافه حالياً.';
        this.loading = false;
      }
    });

    // 🟢 Signaler l'arrivée du visiteur sur le menu
    this.menuService.enterMenu().subscribe();

    // 🔄 Heartbeat : garder la session active toutes les 30s
    this.heartbeatTimer = setInterval(() => {
      this.menuService.enterMenu().subscribe();
    }, 30000);
  }

/** 🔴 Quand l'utilisateur quitte la page (fermeture onglet / navigation). */
  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    this.menuService.leaveMenu();
  }

  /** 🔴 Fallback plus fiable pour la fermeture d'onglet / mobile (sendBeacon). */
  @HostListener('window:pagehide')
  onPageHide(): void {
    this.menuService.leaveMenu();
  }

  /** 🔴 Visibility change → onglet masqué (bascule d'application). */
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      this.menuService.leaveMenu();
    } else if (document.visibilityState === 'visible') {
      // Le visiteur revient → on ré-enregistre sa présence
      this.menuService.enterMenu().subscribe();
    }
  }

  /** 🔴 Nettoyage quand le composant est détruit (navigation interne SPA). */
  ngOnDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.menuService.leaveMenu();
  }

  // ─── Shop helpers ───────────────────────────────────────────

  /** 🆕 Shop name (from the API response `shop_name` or `data.name`). */
  getShopName(): string {
    return this.menuData?.shop_name || this.menuData?.data?.name || '';
  }

  /**
   * 🆕 Shop/tenant logo URL with fallback logic.
   * Returns the custom logo (shop.logo_url / tenant.logo) if present & non-empty,
   * otherwise returns the default green coffee cup logo asset used in the dashboard.
   */
getLogoUrl(): string {
    const logo = this.menuData?.data?.logo_url
            || this.menuData?.logo_url
            || this.menuData?.shop?.logo
            || this.menuData?.tenant?.logo;
    if (logo && String(logo).trim() !== '') {
      return logo;
    }
// Default green coffee cup logo (dashboard header equivalent)
    return 'assets/images/logo.png';
  }

  /** 🆕 True when a real custom logo should be shown (has logo + not errored). */
  hasCustomLogo(): boolean {
    const logo = this.menuData?.data?.logo_url
            || this.menuData?.logo_url
            || this.menuData?.shop?.logo
            || this.menuData?.tenant?.logo;
    return !!(logo && String(logo).trim() !== '' && !this.logoError);
  }

  /** 🆕 Fallback handler when the logo <img> fails to load. */
  onLogoError(): void {
    this.logoError = true;
  }

  // ─── Featured / products helpers ────────────────────────────

  /** 🆕 All active products from the backend. */
  getProducts(): any[] {
    return (this.menuData?.data?.products && Array.isArray(this.menuData.data.products))
      ? this.menuData.data.products
      : [];
  }

/**
   * 👑 The HERO banner product: exclusively the single product with `is_hero === true`.
   * Returns null when no hero product is set (banner hidden).
   */
  getFeaturedProduct(): any {
    const products = this.getProducts();
    if (products.length === 0) return null;
    return products.find((p: any) => p.is_hero === true) || null;
  }

  /** 🆕 All products EXCEPT the hero banner one (for the regular 2-col grid). */
  getRegularProducts(): any[] {
    const featured = this.getFeaturedProduct();
    if (!featured) return this.getProducts();
    return this.getProducts().filter((p: any) => p.id !== featured.id);
  }

  /** 🆕 Products shown in the grid (regular products, optionally favorites/featured only). */
  getFilteredProducts(): any[] {
    let base = this.showFavorites ? this.getFeaturedOnly() : this.getRegularProducts();
    if (!base) return [];

    return base.filter((product: any) => {
      const matchesCategory = this.selectedCategoryId === null || product.category_id === this.selectedCategoryId;
      const matchesSearch = product.name.toLowerCase().includes(this.searchQuery.toLowerCase())
                            || (product.description && product.description.toLowerCase().includes(this.searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }

  /** ⭐ Featured products list (used by the Favorites/Star view) — ALL is_featured items. */
  getFeaturedOnly(): any[] {
    const all = this.getProducts();
    const featured = all.filter((p: any) => p.is_featured === true);
    // Fallback: if none are explicitly featured, show only the hero (if any)
    if (featured.length > 0) return featured;
    const hero = this.getFeaturedProduct();
    return hero ? [hero] : [];
  }

  /** 🆕 Bottom nav: show the full menu (categories + all products). */
  goHome(): void {
    this.showFavorites = false;
    this.selectedCategoryId = null;
    this.searchQuery = '';
    this.currentView = 'main';
  }

  /** 🆕 Bottom nav: toggle Favorites view (featured products only). */
  toggleFavorites(): void {
    this.showFavorites = !this.showFavorites;
    if (this.showFavorites) {
      this.selectedCategoryId = null;
    }
    this.currentView = 'main';
  }

  /** 🆕 Bottom nav: open the cart/checkout view. */
  openCart(): void {
    this.currentView = 'cart';
  }

  // ─── Product size helpers ───────────────────────────────────

  /** 🆕 Returns the sizes array for a given product (or empty). */
  getSizesFor(product: any): any[] {
    if (!product) return [];
    const sizes = product.sizes;
    return (sizes && Array.isArray(sizes)) ? sizes : [];
  }

// فتح تفاصيل المنتج
  openDetails(product: any) {
    this.selectedProduct = product;
    this.detailQuantity = 1;
    this.currentView = 'details';

    // 🆕 Handle product sizes dynamically from backend data
    const sizes = this.getSizesFor(product);
    this.hasSizes = sizes.length > 0;

    if (this.hasSizes) {
      // Auto-select the FIRST available size
      this.selectedSize = sizes[0].size_name ?? null;
      this.selectedPrice = Number(sizes[0].price) || 0;
    } else {
      // No sizes → hide the Size section, use the main product price
      this.selectedSize = null;
      this.selectedPrice = Number(product.price) || 0;
    }
  }

  /** 🆕 Returns the sizes array for the currently selected product (or empty). */
  getProductSizes(): any[] {
    return this.getSizesFor(this.selectedProduct);
  }

  /** 🆕 Select a size and set its exact price (no extra relative amounts). */
  selectSize(size: any): void {
    if (!size) return;
    this.selectedSize = size.size_name ?? null;
    this.selectedPrice = Number(size.price) || 0;
  }

  /** 🆕 The exact unit price for the selected product/size. */
  getSelectedUnitPrice(): number {
    return this.selectedPrice;
  }

  /** 🆕 Total price for the currently selected product/size & quantity. */
  getSelectedTotalPrice(): number {
    return this.getSelectedUnitPrice() * this.detailQuantity;
  }

  /**
   * 🆕 Direct "Add to Cart" for the Hero banner.
   * Auto-picks the first size (or main price) and adds quantity 1.
   */
  quickAddToCart(product: any): void {
    if (!product) return;
    this.selectedProduct = product;
    this.detailQuantity = 1;

    const sizes = this.getSizesFor(product);
    const unitPrice = sizes.length > 0 ? (Number(sizes[0].price) || 0) : (Number(product.price) || 0);
    const sizeName = sizes.length > 0 ? (sizes[0].size_name ?? null) : null;

    const existingItem = this.cart.find(
      item => item.product.id === product.id && item.size === sizeName
    );

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.unitPrice = unitPrice;
      existingItem.totalPrice = existingItem.quantity * unitPrice;
    } else {
      this.cart.push({
        product: product,
        quantity: 1,
        size: sizeName,
        unitPrice: unitPrice,
        totalPrice: unitPrice
      });
    }
  }

  // إضافة المنتج الحالي للسلة
  addToCart() {
    const unitPrice = this.getSelectedUnitPrice();

    // التثبت إذا المنتج بنفس الحجم موجود سابقا في السلة
    const existingItem = this.cart.find(
      item => item.product.id === this.selectedProduct.id && item.size === this.selectedSize
    );

    if (existingItem) {
      existingItem.quantity += this.detailQuantity;
      existingItem.unitPrice = unitPrice;
      existingItem.totalPrice = existingItem.quantity * unitPrice;
    } else {
      this.cart.push({
        product: this.selectedProduct,
        quantity: this.detailQuantity,
        size: this.selectedSize,
        unitPrice: unitPrice,
        totalPrice: this.detailQuantity * unitPrice
      });
    }
    this.currentView = 'main';
  }

  // تغيير الكمية داخل السلة
  updateCartQuantity(index: number, change: number) {
    const item = this.cart[index];
    item.quantity += change;
    if (item.quantity <= 0) {
      this.cart.splice(index, 1);
    } else {
      // Reuse the stored unitPrice (exact price captured at add time)
      item.totalPrice = item.quantity * item.unitPrice;
    }
  }

  // المجموع الإجمالي للسلة
  getCartTotal(): number {
    return this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  // إتمام الطلب واظهار صفحة النجاح
  checkout() {
    if (this.cart.length === 0) return;

    // 🚀 4. تنبيه الحريف إذا كان رقم الطاولة موش موجود في الـ URL
    if (!this.tableNumber) {
      alert('الرجاء مسح رمز الـ QR Code الخاص بالطاولة أولاً لإتمام الطلب!');
      return;
    }

    // 📦 5. تحضير الـ Payload مع الـ table_number المصلّح
    const orderPayload = {
      table_number: this.tableNumber, // 🚀 الحقل الجديد والمهم!
      items: this.cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.unitPrice,   // 🆕 Exact price captured at add time (size or product price)
        size_name: item.size ?? null
      })),
      total_price: this.getCartTotal()
    };

    this.loading = true; // إظهار لودينغ خفيف أثناء البعث

    // 🚀 نبعثوا الطلب للباكند توا
    this.menuService.sendOrder(orderPayload).subscribe({
      next: (res) => {
        this.cart = []; // تفريغ السلة بعد النجاح
        this.loading = false;
        this.currentView = 'success'; // نقل الحريف لصفحة النجاح 🎉
      },
      error: (err) => {
        console.error('Order submission failed', err);
        this.loading = false;
        alert('حدث خطأ أثناء إرسال الطلب، الرجاء المحاولة مرة أخرى.');
      }
    });
  }

  getImageUrl(imagePath: string): string {
    if (imagePath) return `${this.backendUrl}/storage/${imagePath}`;
    return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=200&auto=format&fit=crop';
  }
}
