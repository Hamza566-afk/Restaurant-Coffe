import { Routes } from '@angular/router';
import { LoginOwnerComponent } from './components/login-owner/login-owner';
import { Login } from './components/login/login';
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
import { VerifyOtpComponent } from './components/verify-otp/verify-otp'; // 👈 إضافة الـ VerifyOtpComponent
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { VerifyResetOtpComponent } from './components/verify-reset-otp/verify-reset-otp';
import { ResetPasswordComponent } from './components/reset-password/reset-password';

export const routes: Routes = [
  // 1. التوجيه الافتراضي
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // 🔑 2. مسار الـ Super Admin
  { path: 'super-admin-mrhadded-login', component: Login },

  // ☕ 3. مسار الـ Owner
  { path: 'login', component: LoginOwnerComponent },

  // 🔐 4. مسار الـ OTP
  { path: 'verify-otp', component: VerifyOtpComponent },

  // 📝 5. التسجيل
  { path: 'register', component: RegisterComponent },

  // ⚖️ 6. الشروط القانونية
  { path: 'legal-terms', component: LegalTermsComponent },

  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-reset-otp', component: VerifyResetOtpComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // 🚀 7. مسارات الانتظار والاشتراك المدارية بالـ Guard
  { 
    path: 'waiting-approval', 
    component: WaitingApprovalComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'subscription-expired', 
    component: SubscriptionExpiredComponent,
    canActivate: [authGuard] // 👈 زدنا الـ Guard هوني
  },

  // 🛡️ 8. مسارات الـ Admin
  { 
    path: 'admin/shops',
    component: ShopListComponent,
    canActivate: [authGuard] 
  },

  // ☕ 9. مسارات الـ Owner Dashboard
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

  // 📜 10. المينيو الخارجي
  { path: 'menu', component: MenuComponent },

  // 🔄 11. أي مسار آخر يرجع للـ /login
  { path: '**', redirectTo: 'login' }
];