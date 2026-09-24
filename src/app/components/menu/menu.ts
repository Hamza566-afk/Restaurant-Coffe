import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ClientMenuService, ActiveOrderResponse } from '../../services/client-menu';
import { LanguageService } from '../../services/language.service';
import { CurrencyFormatPipe } from '../../pipes/currency-format-pipe';

interface CartItem {
  product: any;
  quantity: number;
  size?: string | null;
  size_name?: string | null;
  note?: string | null;
  unitPrice: number;
  totalPrice: number;
}

interface CustomAlertConfig {
  show: boolean;
  type: 'confirm' | 'info' | 'error' | 'success';
  titleKey?: string;
  messageKey?: string;
  rawMessage?: string;
  confirmBtnKey?: string;
  cancelBtnKey?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class MenuComponent implements OnInit, OnDestroy {
  private menuService = inject(ClientMenuService);
  private route = inject(ActivatedRoute);
  private cd = inject(ChangeDetectorRef);
  protected languageService = inject(LanguageService);
  protected t = (key: string): string => this.languageService.t(key);

  menuData: any = null;
  loading: boolean = true;
  errorMessage: string = '';

  // Localization and Currency Properties
  currencyCode: string = 'TND';
  locale: string = 'ar-TN';

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
  orderNote: string = '';
  tableNumber: number | null = null;
  shopSlug: string | null = null;

  // Top Custom Alert State
  customAlert: CustomAlertConfig = {
    show: false,
    type: 'info'
  };

  // Active Orders Live Tracking
  activeOrders: ActiveOrderResponse[] = [];
  private eventSources: { [orderId: number]: EventSource } = {};
  private orderPollers: { [orderId: number]: any } = {};

  backendUrl: string = 'https://restaurant-coffe-backend-production-3fce.up.railway.app';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

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
      this.restoreActiveOrders();
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
        this.currencyCode = res?.currency_code || res?.currency || 'TND';
        this.locale = res?.locale || 'ar-TN';
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load menu', err);
        this.errorMessage = this.t('menu.notFoundError') || 'المحل غير موجود أو تم إيقافه حالياً.';
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
    this.closeAllSseConnections();
    this.stopAllPollers();
    this.menuService.leaveMenu(this.shopSlug);
  }

  // ─── Custom Top Alert Methods ──────────────────────────────

  showAlert(config: Partial<CustomAlertConfig>): void {
    this.customAlert = {
      show: true,
      type: config.type || 'info',
      titleKey: config.titleKey,
      messageKey: config.messageKey,
      rawMessage: config.rawMessage,
      confirmBtnKey: config.confirmBtnKey || 'menu.dialog.confirm',
      cancelBtnKey: config.cancelBtnKey || 'menu.dialog.dismiss',
      onConfirm: config.onConfirm,
      onCancel: config.onCancel
    };
    this.cd.detectChanges();
  }

  closeAlert(): void {
    this.customAlert.show = false;
    this.cd.detectChanges();
  }

  handleAlertConfirm(): void {
    if (this.customAlert.onConfirm) {
      this.customAlert.onConfirm();
    }
    this.closeAlert();
  }

  handleAlertCancel(): void {
    if (this.customAlert.onCancel) {
      this.customAlert.onCancel();
    }
    this.closeAlert();
  }

  // ─── Live Tracking (SSE) & LocalStorage ──────────────────────

  restoreActiveOrders(): void {
    if (this.tableNumber) {
      this.menuService.getActiveOrdersForTable(this.tableNumber, this.shopSlug).subscribe({
        next: (orders) => {
          if (orders && orders.length > 0) {
            this.activeOrders = orders;
            this.syncLocalStorageOrderIds();
            this.activeOrders.forEach(o => this.startOrderStream(o.id));
          } else {
            this.checkLocalStorageOrders();
          }
        },
        error: () => this.checkLocalStorageOrders()
      });
    } else {
      this.checkLocalStorageOrders();
    }
  }

  private checkLocalStorageOrders(): void {
    const savedIdsRaw = localStorage.getItem('active_order_ids');
    const orderIds: number[] = savedIdsRaw ? JSON.parse(savedIdsRaw) : [];

    if (orderIds.length > 0) {
      orderIds.forEach(id => {
        this.menuService.getActiveOrder(id).subscribe({
          next: (res: any) => {
            const order = res?.order || res;
            if (order && !['paid', 'paye', 'cancelled', 'annule'].includes(String(order.status).toLowerCase())) {
              if (!this.activeOrders.some(o => o.id === order.id)) {
                this.activeOrders.push(order);
                this.startOrderStream(order.id);
              }
            } else {
              this.removeOrderIdFromStorage(id);
            }
          },
          error: () => this.removeOrderIdFromStorage(id)
        });
      });
    }
  }

  private syncLocalStorageOrderIds(): void {
    const ids = this.activeOrders.map(o => o.id);
    localStorage.setItem('active_order_ids', JSON.stringify(ids));
  }

  private addOrderIdToStorage(id: number): void {
    const savedIdsRaw = localStorage.getItem('active_order_ids');
    const orderIds: number[] = savedIdsRaw ? JSON.parse(savedIdsRaw) : [];
    if (!orderIds.includes(id)) {
      orderIds.push(id);
      localStorage.setItem('active_order_ids', JSON.stringify(orderIds));
    }
  }

  private removeOrderIdFromStorage(id: number): void {
    const savedIdsRaw = localStorage.getItem('active_order_ids');
    let orderIds: number[] = savedIdsRaw ? JSON.parse(savedIdsRaw) : [];
    orderIds = orderIds.filter(i => i !== id);
    localStorage.setItem('active_order_ids', JSON.stringify(orderIds));
  }

  startOrderStream(orderId: number): void {
    if (this.eventSources[orderId]) {
      this.eventSources[orderId].close();
    }

    const url = this.menuService.getOrderSseUrl(orderId);
    const es = new EventSource(url);
    this.eventSources[orderId] = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data) {
          this.updateOrderDataInState(orderId, data);
        }
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    es.onerror = () => {
      this.closeSseConnection(orderId);
      this.startPollingFallback(orderId);
    };
  }

  private startPollingFallback(orderId: number): void {
    if (this.orderPollers[orderId]) return;

    this.orderPollers[orderId] = setInterval(() => {
      this.menuService.getActiveOrder(orderId).subscribe({
        next: (res: any) => {
          const order = res?.order || res;
          if (order) {
            this.updateOrderDataInState(orderId, order);
          }
        },
        error: () => this.stopPolling(orderId)
      });
    }, 3000);
  }

  private updateOrderDataInState(orderId: number, data: any): void {
    const target = this.activeOrders.find(o => o.id === orderId);
    if (target) {
      if (data.status) target.status = data.status;
      if (data.display_number) (target as any).display_number = data.display_number;
      if (data.daily_order_number) (target as any).daily_order_number = data.daily_order_number;
      if (data.queue_position !== undefined) (target as any).queue_position = data.queue_position;
    }
    this.cd.detectChanges();

    const statusClean = String(data.status).toLowerCase();
    if (['paid', 'paye', 'cancelled', 'annule'].includes(statusClean)) {
      this.activeOrders = this.activeOrders.filter(o => o.id !== orderId);
      this.removeOrderIdFromStorage(orderId);
      this.closeSseConnection(orderId);
      this.stopPolling(orderId);
      if (this.activeOrders.length === 0 && this.currentView === 'tracking') {
        this.currentView = 'main';
      }
    }
  }

  closeSseConnection(orderId: number): void {
    if (this.eventSources[orderId]) {
      this.eventSources[orderId].close();
      delete this.eventSources[orderId];
    }
  }

  closeAllSseConnections(): void {
    Object.keys(this.eventSources).forEach(id => {
      this.closeSseConnection(+id);
    });
  }

  private stopPolling(orderId: number): void {
    if (this.orderPollers[orderId]) {
      clearInterval(this.orderPollers[orderId]);
      delete this.orderPollers[orderId];
    }
  }

  private stopAllPollers(): void {
    Object.keys(this.orderPollers).forEach(id => {
      this.stopPolling(+id);
    });
  }

  cancelActiveOrder(orderId: number): void {
    this.showAlert({
      type: 'confirm',
      titleKey: 'menu.cancelOrder',
      messageKey: 'menu.confirmCancelOrder',
      confirmBtnKey: 'menu.dialog.confirm',
      cancelBtnKey: 'menu.dialog.dismiss',
      onConfirm: () => {
        this.loading = true;
        this.menuService.cancelOrder(orderId).subscribe({
          next: () => {
            this.loading = false;
            this.showAlert({
              type: 'success',
              messageKey: 'menu.orderCancelledSuccess'
            });
            this.activeOrders = this.activeOrders.filter(o => o.id !== orderId);
            this.removeOrderIdFromStorage(orderId);
            this.closeSseConnection(orderId);
            this.stopPolling(orderId);
            if (this.activeOrders.length === 0) {
              this.currentView = 'main';
            }
          },
          error: (err) => {
            this.loading = false;
            this.showAlert({
              type: 'error',
              rawMessage: err.error?.message || 'تعذر إلغاء الطلب حالياً.'
            });
          }
        });
      }
    });
  }

  editOrder(order: any): void {
    this.showAlert({
      type: 'confirm',
      titleKey: 'menu.editOrder',
      messageKey: 'menu.confirmEditOrder',
      confirmBtnKey: 'menu.dialog.confirmEdit',
      cancelBtnKey: 'menu.dialog.dismiss',
      onConfirm: () => {
        this.loading = true;
        this.menuService.cancelOrder(order.id).subscribe({
          next: () => {
            this.loading = false;
            
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                const productObj = item.product || { id: item.product_id, name: item.product_name || 'منتج', image_path: item.image_path || '' };
                this.cart.push({
                  product: productObj,
                  quantity: item.quantity,
                  size: item.size_name || null,
                  size_name: item.size_name || null,
                  unitPrice: Number(item.price) || 0,
                  totalPrice: (Number(item.price) || 0) * item.quantity
                });
              });
            }

            if (order.note) {
              this.orderNote = order.note;
            }

            this.activeOrders = this.activeOrders.filter(o => o.id !== order.id);
            this.removeOrderIdFromStorage(order.id);
            this.closeSseConnection(order.id);
            this.stopPolling(order.id);
            
            this.currentView = 'cart';
            this.cd.detectChanges();
          },
          error: (err) => {
            this.loading = false;
            this.showAlert({
              type: 'error',
              rawMessage: err.error?.message || 'تعذر تعديل الطلب حالياً.'
            });
          }
        });
      }
    });
  }

  getStatusProgressStep(status?: string): number {
    const currentStatus = status || (this.activeOrders[0]?.status);
    switch (String(currentStatus).toLowerCase()) {
      case 'pending':
      case 'en_attente': return 1;
      case 'confirmed':
      case 'en_preparation': return 2;
      case 'ready':
      case 'prete': return 3;
      case 'paid':
      case 'paye': return 4;
      default: return 1;
    }
  }

  getClientStatusAlert(status?: string): string {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'pending':
      case 'en_attente':
        return this.t('menu.preparingNow') || 'طلبك قيد الانتظار ⏳';
      case 'confirmed':
      case 'en_preparation':
        return this.t('menu.preparingNow') || 'طلبك قيد التحضير الآن 👨‍🍳';
      case 'ready':
      case 'prete':
        return this.t('menu.readyForPickup') || 'طلبك جاهز! يمكنك الاستلام الآن ☕🎉';
      case 'paid':
      case 'paye':
        return this.t('menu.orderCompleted') || 'تم خلاص الطلب، شكراً لزيارتكم! ❤️';
      case 'cancelled':
      case 'annule':
        return 'تم إلغاء الطلب ❌';
      default:
        return 'طلبك قيد المتابعة...';
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
    if (this.activeOrders.length > 0 && this.cart.length === 0) {
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
      item => item.product.id === product.id && (item.size === sizeName || item.size_name === sizeName)
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
        size_name: sizeName,
        unitPrice: unitPrice,
        totalPrice: unitPrice
      });
    }
  }

  addToCart() {
    const unitPrice = this.getSelectedUnitPrice();

    const existingItem = this.cart.find(
      item => item.product.id === this.selectedProduct.id && (item.size === this.selectedSize || item.size_name === this.selectedSize)
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
        size_name: this.selectedSize,
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
      this.showAlert({
        type: 'error',
        messageKey: 'menu.scanQrError',
        rawMessage: 'الرجاء مسح رمز الـ QR Code الخاص بالطاولة أولاً لإتمام الطلب!'
      });
      return;
    }

    const orderPayload = {
      table_number: this.tableNumber,
      note: this.orderNote,
      items: this.cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.unitPrice,
        size_name: item.size ?? item.size_name ?? null
      })),
      total_price: this.getCartTotal()
    };

    this.loading = true;

    this.menuService.sendOrder(orderPayload, this.shopSlug).subscribe({
      next: (res) => {
        this.cart = [];
        this.orderNote = '';
        this.loading = false;
        if (res && res.order) {
          this.activeOrders.unshift(res.order);
          this.addOrderIdToStorage(res.order.id);
          this.startOrderStream(res.order.id);
        }
        this.currentView = 'tracking';
      },
      error: (err) => {
        console.error('Order submission failed', err);
        this.loading = false;
        this.showAlert({
          type: 'error',
          rawMessage: err.error?.message || this.t('menu.orderSendError') || 'حدث خطأ أثناء إرسال الطلب، الرجاء المحاولة مرة أخرى.'
        });
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