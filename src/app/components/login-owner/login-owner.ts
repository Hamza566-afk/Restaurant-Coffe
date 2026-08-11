import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login-owner',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-owner.html',
  styleUrls: ['./login-owner.css']
})
export class LoginOwnerComponent {
  credentials = { email: '', password: '' };

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.authService.getCsrfCookie().subscribe(() => {
      // 🚀 عيطنا للـ loginOwner
      this.authService.loginOwner(this.credentials).subscribe({
        next: (res: any) => {
          // 🚀 التثبت الفوري عند الدخول:
          // نثبتوا إذا كان الحساب موجود والـ shop مش مفعّل (is_active == false أو 0)
          if (res && res.shop && !res.shop.is_active) {

            // نثبتوا هل عنده اشتراكات سابقة في جدول الـ subscriptions
            const hasSubscriptions = res.shop.subscriptions && res.shop.subscriptions.length > 0;

            if (hasSubscriptions) {
              // حساب قديم واشتراكه وفى -> لصفحة انتهاء الاشتراك
              this.router.navigate(['/subscription-expired']);
            } else {
              // حساب جديد عمره ما تفعّل -> لصفحة الانتظار
              this.router.navigate(['/waiting-approval']);
            }
            return; // نوقفوا الكود هوني باش ما يتعداش للـ Dashboard!
          }

          // إذا الحساب مفعل وأموره واضحة، يتعدى للـ Dashboard عادي
          this.router.navigate(['/dashboard/home']);
        },
        error: (err) => {
          alert('خطأ في البيانات أو الحساب غير مفعل');
        }
      });
    });
  }
}

