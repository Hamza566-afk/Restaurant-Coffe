import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { LoginOwnerComponent } from './components/login-owner/login-owner';
import { RegisterComponent } from './components/register/register';
import { ShopListComponent } from './components/shop-list/shop-list';
import { ProductListComponent } from './components/product-list/product-list';
import { DashboardComponent } from './components/dashboard/dashboard';
import { Home } from './components/home/home'; // الكومبوننت اللي باش يظهر داخل الـ Dashboard
import { QrCode } from './components/qr-code/qr-code';
import { authGuard } from './guards/auth-guard';
import { Orders } from './components/orders/orders';
// 🚀 1. عملنا import للـ WaitingApprovalComponent الجديد
import { WaitingApprovalComponent } from './components/waiting-approval/waiting-approval';
import { SubscriptionExpiredComponent } from './components/subscription-expired/subscription-expired';
import { MenuComponent } from './components/menu/menu';
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // مسارات الـ Auth
  { path: 'login', component: Login },
  { path: 'login-owner', component: LoginOwnerComponent },
  { path: 'register', component: RegisterComponent },

  // 🚀 2. مسار صفحة الانتظار (زدناها خارج الـ Dashboard ومحمية بالـ Guard)
  { 
    path: 'waiting-approval', 
    component: WaitingApprovalComponent, 
    canActivate: [authGuard] 
  },
  { path: 'subscription-expired', component: SubscriptionExpiredComponent },

  // 1. مسارات الـ Admin
  { 
    path: 'admin/shops',
    component: ShopListComponent,
    canActivate: [authGuard] 
  },

  // 2. مسارات الـ Owner (الـ Dashboard والـ Children متاعها)
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard], // هذا يحمي الـ /dashboard والـ children الكل فرد مرة
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: Home }, // هكا يولي المسار /dashboard/home ومحمي أوتوماتيكياً
      { path: 'orders', component: Orders },
      { path: 'products', component: ProductListComponent }, 
      { path: 'qr-code', component: QrCode } 
    ]
  },
  { 
    path: 'menu', 
    component: MenuComponent 
  },
];