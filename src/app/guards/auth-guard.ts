import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';
import { map } from 'rxjs';

export const authGuard = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // state.url يعطيك الـ URL الجديد اللي المستخدم يحب يدخلّه
  const targetUrl = state.url;

  return authService.checkAuth().pipe(
    map((user) => {
      // 1. إذا كان الـ User مسجل
      if (user) {

        // 🚀 الحماية المطورة لأصحاب المحلات (Owners)
        if (user.role === 'owner') {
          const isShopActive = user.shop?.is_active;
          // نثبتوا هل عنده اشتراكات سابقة في جدول الـ subscriptions
          const hasSubscriptions = user.shop?.subscriptions && user.shop.subscriptions.length > 0;

          // ❌ [حالة 1] إذا كان الحساب مش مفعّل (is_active == false أو 0)
          if (!isShopActive) {

            if (hasSubscriptions) {
              // حساب قديم واشتراكه وفى -> لازم يكون في صفحة subscription-expired
              if (!targetUrl.includes('subscription-expired')) {
                router.navigate(['/subscription-expired']);
                return false;
              }
            } else {
              // حساب جديد عمره ما تفعّل -> لازم يكون في صفحة waiting-approval
              if (!targetUrl.includes('waiting-approval')) {
                router.navigate(['/waiting-approval']);
                return false;
              }
            }

            return true; // نخلّوه يقعد في الصفحة الصحيحة متاعو (إما waiting أو expired)
          }

          //  [حالة 2] إذا كان الحساب مفعّل ديجا (is_active == true) ويحاول يدخل لصفحات الانتظار أو الانتهاء غلطة
          if (isShopActive && (targetUrl.includes('waiting-approval') || targetUrl.includes('subscription-expired'))) {
            router.navigate(['/dashboard/home']);
            return false;
          }
        }

        // إذا كل شيء مريڨل (Admin أو Owner مفعّل)، يخليه يتعدى
        return true;
      }

      // 2. إذا كان موش مسجل، نثبتوا في الـ URL اللي كان يحب يدخلّه
      if (targetUrl.includes('dashboard') || targetUrl.includes('shop') || targetUrl.includes('waiting-approval') || targetUrl.includes('subscription-expired')) {
        router.navigate(['/login-owner']);
      } else {
        router.navigate(['/login']);
      }

      return false;
    })
  );
};

