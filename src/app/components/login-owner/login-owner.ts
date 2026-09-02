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
    this.authService.getCsrfCookie().subscribe({
      next: () => {
        this.authService.loginOwner(this.credentials).subscribe({
          next: (res: any) => {
            // 🚀 1. إذا البيانات صحيحة، السيرفر يرجع require_otp -> نبعثوه لصفحة الـ OTP مباشرة
            if (res && res.require_otp) {
              this.router.navigate(['/verify-otp'], { 
                queryParams: { email: this.credentials.email } 
              });
              return;
            }

            // 🚀 2. لو افترضنا سجل دخول مباشر بدون OTP (احتياط)
            if (res && res.shop && !res.shop.is_active) {
              const hasSubscriptions = res.shop.subscriptions && res.shop.subscriptions.length > 0;
              if (hasSubscriptions) {
                this.router.navigate(['/subscription-expired']);
              } else {
                this.router.navigate(['/waiting-approval']);
              }
              return;
            }

            this.router.navigate(['/dashboard/home']);
          },
          error: (err) => {
            alert(err.error?.message || 'خطأ في البيانات أو الحساب غير مفعل');
          }
        });
      },
      error: (err) => console.error('CSRF Error:', err)
    });
  }
}