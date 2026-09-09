import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent implements OnInit {
  public langService = inject(LanguageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  resetToken: string = '';
  password: string = '';
  confirmPassword: string = '';
  
  isLoading: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.email = localStorage.getItem('reset_email') || '';
    this.resetToken = localStorage.getItem('reset_token') || '';

    if (!this.email || !this.resetToken) {
      this.router.navigate(['/forgot-password']);
    }
  }

  onSubmit() {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'كلمات السر غير متطابقة';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'كلمة السر يجب أن تحتوي على 6 خانات على الأقل';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.resetPassword(this.email, this.resetToken, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        // تنظيف البيانات المؤقتة
        localStorage.removeItem('reset_email');
        localStorage.removeItem('reset_token');
        
        alert('تم تغيير كلمة السر بنجاح! يمكنك الآن تسجيل الدخول.');
        this.router.navigate(['/login-owner']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'حدث خطأ أثناء تغيير كلمة السر';
      }
    });
  }
}