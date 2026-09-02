import { Routes } from '@angular/router';
import { LoginOwnerComponent } from './components/login-owner/login-owner'; // هذا الـ Component اللّي كاين يخدم للـ Owner
import { Login } from './components/login/login'; // هذا الـ Component متاع الـ Admin
import { RegisterComponent } from './components/register/register';
import { ShopListComponent } from './components/shop-list/shop-list';
import { ProductListComponent } from './components/product-list/product-list';
import { DashboardComponent } from './components/dashboard/dashboard';
import { Home } from './components/home/home';
import { QrCode } from './components/qr-code/qr-code';
import { authGuard } from './guards/auth-guard';
import { Orders } from './components/orders/orders';
import { WaitingApprovalComponent } from './components/waiting-approval/waiting-approval';
import { SubscriptionExpiredComponent } from './components/subscription-expired/subscription-expired';
import { MenuComponent } from './components/menu/menu';
import { LegalTermsComponent } from './components/legal-terms/legal-terms';

export const routes: Routes = [
  // 1. التوجيه الافتراضي يطير للـ login المباشر
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // 🔑 2. مسار الـ Super Admin (الكود متاع الـ Login الأصلي)
  { path: 'super-admin-mrhadded-login', component: Login },

  // ☕ 3. مسار الـ Owner (الواجهة الرئيسية متاع الـ Owners تظهر في الـ URL كـ /login)
  { path: 'login', component: LoginOwnerComponent },

  // 📝 4. التسجيل يبقى كيما هو
  { path: 'register', component: RegisterComponent },

  // ⚖️ 5. مسار الشروط القانونية والملكية الفكرية
  { path: 'legal-terms', component: LegalTermsComponent },

  // 🚀 6. مسارات الانتظار والاشتراك
  { 
    path: 'waiting-approval', 
    component: WaitingApprovalComponent, 
    canActivate: [authGuard] 
  },
  { path: 'subscription-expired', component: SubscriptionExpiredComponent },

  // 🛡️ 7. مسارات الـ Admin
  { 
    path: 'admin/shops',
    component: ShopListComponent,
    canActivate: [authGuard] 
  },

  // ☕ 8. مسارات الـ Owner Dashboard
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: Home },
      { path: 'orders', component: Orders },
      { path: 'products', component: ProductListComponent }, 
      { path: 'qr-code', component: QrCode } 
    ]
  },

  // 📜 9. المينيو الخارجي
  { path: 'menu', component: MenuComponent },

  // 🔄 10. أي مسار مغلوط يرجع للـ /login
  { path: '**', redirectTo: 'login' }
];