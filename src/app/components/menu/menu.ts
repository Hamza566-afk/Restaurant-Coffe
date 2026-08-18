import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ClientMenuService, ActiveOrderResponse } from '../../services/client-menu';

interface CartItem {
  product: any;
  quantity: number;
  size?: string | null;
  unitPrice: number;
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

  currentView: 'main' | 'details' | 'cart' | 'tracking' = 'main';

  selectedCategoryId: number | null = null;
  searchQuery: string = '';
  showFavorites: boolean = false;
  logoError: boolean = false;

  selectedProduct: any = null;
  selectedSize: string | null = null;
  selectedPrice: number = 0;
  hasSizes: boolean = false;
  detailQuantity: number = 1;

  cart: CartItem[] = [];
  tableNumber: number | null = null;
  shopSlug: string | null = null;

  // Active Order Live Tracking
  activeOrder: ActiveOrderResponse | null = null;
  private eventSource: EventSource | null = null;

  backendUrl: string = 'https://restaurant-coffe-backend-production.up.railway.app';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private menuService: ClientMenuService,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tableRaw = params['table'] ?? params['table_id'];
      this.tableNumber = tableRaw ? +tableRaw : null;
      if (this.tableNumber !== null && Number.isNaN(this.tableNumber)) {
        this.tableNumber = null;
      }

      this.shopSlug =
        params['shop'] ??
        params['subdomain'] ??
        params['shop_id'] ??
        null;

      this.loadMenuData();
      this.startPresenceTracking();
      this.restoreActiveOrder();
    });
  }

  private startPresenceTracking(): void {
    this.menuService.enterMenu(this.shopSlug).subscribe();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.menuService.enterMenu(this.shopSlug).subscribe();
    }, 30000);
  }

  loadMenuData(): void {
    this.loading = true;
    this.menuService.getMenu(this.shopSlug).subscribe({
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
  }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    this.menuService.leaveMenu(this.shopSlug);
  }

  @HostListener('window:pagehide')
  onPageHide(): void {
    this.menuService.leaveMenu(this.shopSlug);
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      this.menuService.leaveMenu(this.shopSlug);
    } else if (document.visibilityState === 'visible') {
      this.menuService.enterMenu(this.shopSlug).subscribe();
    }
  }

  ngOnDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.closeSseConnection();
    this.menuService.leaveMenu(this.shopSlug);
  }

  // ─── Live Tracking (SSE) ───────────────────────────────────

  restoreActiveOrder(): void {
    const savedOrderId = localStorage.getItem('active_order_id');
    if (savedOrderId) {
      const orderId = +savedOrderId;
      this.menuService.getActiveOrder(orderId).subscribe({
        next: (order) => {
          if (order && order.status !== 'paid' && order.status !== 'cancelled') {
            this.activeOrder = order;
            this.startOrderStream(order.id);
          } else {
            localStorage.removeItem('active_order_id');
          }
        },
        error: () => {
          localStorage.removeItem('active_order_id');
        }
      });
    }
  }

  startOrderStream(orderId: number): void {
    this.closeSseConnection();
    const url = this.menuService.getOrderSseUrl(orderId);
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.status) {
          if (this.activeOrder) {
            this.activeOrder.status = data.status;
          }
          this.cd.detectChanges();

          if (data.status === 'paid' || data.status === 'cancelled') {
            localStorage.removeItem('active_order_id');
            this.closeSseConnection();
          }
        }
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    this.eventSource.onerror = (err) => {
      console.error('SSE Connection error:', err);
      this.closeSseConnection();
    };
  }

  closeSseConnection(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  cancelActiveOrder(): void {
    if (!this.activeOrder) return;
    if (confirm('هل أنت متأكد من إلغاء الطلب؟')) {
      this.loading = true;
      this.menuService.cancelOrder(this.activeOrder.id).subscribe({
        next: () => {
          this.loading = false;
          alert('تم إلغاء الطلب بنجاح');
          this.activeOrder = null;
          localStorage.removeItem('active_order_id');
          this.closeSseConnection();
          this.currentView = 'main';
        },
        error: (err) => {
          this.loading = false;
          alert(err.error?.message || 'تعذر إلغاء الطلب حالياً.');
        }
      });
    }
  }

  getStatusProgressStep(): number {
    if (!this.activeOrder) return 1;
    switch (this.activeOrder.status) {
      case 'pending': return 1;
      case 'confirmed': return 2;
      case 'ready': return 3;
      case 'paid': return 4;
      default: return 1;
    }
  }

  // ─── Shop helpers ───────────────────────────────────────────

  getShopName(): string {
    return this.menuData?.shop_name || this.menuData?.data?.name || '';
  }

  getLogoUrl(): string {
    const logo = this.menuData?.data?.logo_url
            || this.menuData?.logo_url
            || this.menuData?.shop?.logo
            || this.menuData?.tenant?.logo;
    if (logo && String(logo).trim() !== '') {
      return logo.startsWith('http') ? logo : `${this.backendUrl}/storage/${logo}`;
    }
    return 'assets/images/logo.png';
  }

  hasCustomLogo(): boolean {
    const logo = this.menuData?.data?.logo_url
            || this.menuData?.logo_url
            || this.menuData?.shop?.logo
            || this.menuData?.tenant?.logo;
    return !!(logo && String(logo).trim() !== '' && !this.logoError);
  }

  onLogoError(): void {
    this.logoError = true;
  }

  // ─── Featured / products helpers ────────────────────────────

  getProducts(): any[] {
    return (this.menuData?.data?.products && Array.isArray(this.menuData.data.products))
      ? this.menuData.data.products
      : [];
  }

  getFeaturedProduct(): any {
    const products = this.getProducts();
    if (products.length === 0) return null;
    return products.find((p: any) => p.is_hero === true) || null;
  }

  getRegularProducts(): any[] {
    const featured = this.getFeaturedProduct();
    if (!featured) return this.getProducts();
    return this.getProducts().filter((p: any) => p.id !== featured.id);
  }

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

  getFeaturedOnly(): any[] {
    const all = this.getProducts();
    const featured = all.filter((p: any) => p.is_featured === true);
    if (featured.length > 0) return featured;
    const hero = this.getFeaturedProduct();
    return hero ? [hero] : [];
  }

  goHome(): void {
    this.showFavorites = false;
    this.selectedCategoryId = null;
    this.searchQuery = '';
    this.currentView = 'main';
  }

  toggleFavorites(): void {
    this.showFavorites = !this.showFavorites;
    if (this.showFavorites) {
      this.selectedCategoryId = null;
    }
    this.currentView = 'main';
  }

  openCart(): void {
    if (this.activeOrder && this.cart.length === 0) {
      this.currentView = 'tracking';
    } else {
      this.currentView = 'cart';
    }
  }

  // ─── Product size helpers ───────────────────────────────────

  getSizesFor(product: any): any[] {
    if (!product) return [];
    const sizes = product.sizes;
    return (sizes && Array.isArray(sizes)) ? sizes : [];
  }

  openDetails(product: any) {
    this.selectedProduct = product;
    this.detailQuantity = 1;
    this.currentView = 'details';

    const sizes = this.getSizesFor(product);
    this.hasSizes = sizes.length > 0;

    if (this.hasSizes) {
      this.selectedSize = sizes[0].size_name ?? null;
      this.selectedPrice = Number(sizes[0].price) || 0;
    } else {
      this.selectedSize = null;
      this.selectedPrice = Number(product.price) || 0;
    }
  }

  getProductSizes(): any[] {
    return this.getSizesFor(this.selectedProduct);
  }

  selectSize(size: any): void {
    if (!size) return;
    this.selectedSize = size.size_name ?? null;
    this.selectedPrice = Number(size.price) || 0;
  }

  getSelectedUnitPrice(): number {
    return this.selectedPrice;
  }

  getSelectedTotalPrice(): number {
    return this.getSelectedUnitPrice() * this.detailQuantity;
  }

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

  addToCart() {
    const unitPrice = this.getSelectedUnitPrice();

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

  updateCartQuantity(index: number, change: number) {
    const item = this.cart[index];
    item.quantity += change;
    if (item.quantity <= 0) {
      this.cart.splice(index, 1);
    } else {
      item.totalPrice = item.quantity * item.unitPrice;
    }
  }

  removeFromCart(index: number) {
    this.cart.splice(index, 1);
  }

  getCartTotal(): number {
    return this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  checkout() {
    if (this.cart.length === 0) return;

    if (!this.tableNumber) {
      alert('الرجاء مسح رمز الـ QR Code الخاص بالطاولة أولاً لإتمام الطلب!');
      return;
    }

    const orderPayload = {
      table_number: this.tableNumber,
      items: this.cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.unitPrice,
        size_name: item.size ?? null
      })),
      total_price: this.getCartTotal()
    };

    this.loading = true;

    this.menuService.sendOrder(orderPayload, this.shopSlug).subscribe({
      next: (res) => {
        this.cart = [];
        this.loading = false;
        if (res && res.order) {
          this.activeOrder = res.order;
          localStorage.setItem('active_order_id', res.order.id.toString());
          this.startOrderStream(res.order.id);
        }
        this.currentView = 'tracking';
      },
      error: (err) => {
        console.error('Order submission failed', err);
        this.loading = false;
        alert('حدث خطأ أثناء إرسال الطلب، الرجاء المحاولة مرة أخرى.');
      }
    });
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) {
      return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=200&auto=format&fit=crop';
    }
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `${this.backendUrl}/storage/${imagePath}`;
  }
}