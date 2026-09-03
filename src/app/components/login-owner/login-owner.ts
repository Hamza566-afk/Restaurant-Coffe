import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CaptchaComponent } from '../captcha/captcha';

@Component({
  selector: 'app-login-owner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CaptchaComponent],
  templateUrl: './login-owner.html',
  styleUrls: ['./login-owner.css']
})
export class LoginOwnerComponent {
  credentials = { email: '', password: '' };
  showPassword = false;
  isCaptchaValid = false;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onCaptchaStatusChange(status: boolean) {
    this.isCaptchaValid = status;
  }

  onLogin() {
    if (!this.isCaptchaValid) return;

    this.isLoading = true;
    this.authService.getCsrfCookie().subscribe({
      next: () => {
        this.authService.loginOwner(this.credentials).subscribe({
          next: (res: any) => {
            this.isLoading = false;
            if (res && res.require_otp) {
              this.router.navigate(['/verify-otp'], { 
                queryParams: { email: this.credentials.email } 
              });
              return;
            }

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
            this.isLoading = false;
            alert(err.error?.message || 'خطأ في البيانات أو الحساب غير مفعل');
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('CSRF Error:', err);
      }
    });
  }
}