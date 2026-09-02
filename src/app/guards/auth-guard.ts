import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';
import { map } from 'rxjs';

export const authGuard = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const targetUrl = state.url;

  return authService.checkAuth().pipe(
    map((user) => {
      // 1. إذا كان المستخدم مسجل دخول
      if (user) {

        // 🚀 الحماية المطورة لأصحاب المحلات (Owners)
        if (user.role === 'owner') {
          const isShopActive = user.shop?.is_active;
          const hasSubscriptions = user.shop?.subscriptions && user.shop.subscriptions.length > 0;

          // ❌ [حالة 1] إذا كان الحساب غير مفعّل
          if (!isShopActive) {

            if (hasSubscriptions) {
              // اشتراك منتهي
              if (!targetUrl.includes('/subscription-expired')) {
                router.navigate(['/subscription-expired']);
                return false;
              }
            } else {
              // حساب جديد ينتظر الموافقة
              if (!targetUrl.includes('/waiting-approval')) {
                router.navigate(['/waiting-approval']);
                return false;
              }
            }

            return true; // السماح بالبقاء في الصفحة المناسبة لحالته
          }

          // ✅ [حالة 2] إذا كان الحساب مفعّلاً ويحاول فتح صفحات الانتظار/الانتهاء
          if (isShopActive && (targetUrl.includes('/waiting-approval') || targetUrl.includes('/subscription-expired'))) {
            router.navigate(['/dashboard/home']);
            return false;
          }
        }

        // الأدمن أو الأونر المفعّل يتعدى عادي
        return true;
      }

      // 2. إذا كان المستخدم غير مسجل دخول مطلقاً
      // السماح بزيارة صفحة تسجيل الدخول والـ OTP لتفادي الـ Infinite Loop
      if (targetUrl.includes('/login') || targetUrl.includes('/login-owner') || targetUrl.includes('/verify-otp')) {
        return true;
      }

      // التوجيه للـ Login حسب مسار الهدف
      if (targetUrl.includes('dashboard') || targetUrl.includes('waiting-approval') || targetUrl.includes('subscription-expired')) {
        router.navigate(['/login']);
      } else {
        router.navigate(['/super-admin-mrhadded-login']);
      }

      return false;
    })
  );
};