import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './verify-otp.html',
  styleUrls: ['./verify-otp.css']
})
export class VerifyOtpComponent implements OnInit {
  email: string = '';
  otpCode: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // 1. التثبت من الـ Query Parameters في الـ URL أولاً
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || localStorage.getItem('pending_otp_email') || '';
      
      // إذا لم نجد الإيميل إطلاقاً، نرجعوه لصفحة تسجيل الدخول
      if (!this.email) {
        this.router.navigate(['/login-owner']);
      }
    });
  }

  onVerify(): void {
    if (this.otpCode.length !== 6) {
      this.errorMessage = 'الرجاء إدخال كود متكون من 6 أرقام';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyOtp(this.email, this.otpCode).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        localStorage.removeItem('pending_otp_email');

        // 🚀 التثبت الفوري من حالة المحل بعد التفعيل:
        const shop = res?.shop;
        
        if (shop && !shop.is_active) {
          const hasSubscriptions = shop.subscriptions && shop.subscriptions.length > 0;

          if (hasSubscriptions) {
            // حساب قديم واشتراكه انتهى
            this.router.navigate(['/subscription-expired']);
          } else {
            // حساب جديد ينتظر موافقة الأدمن
            this.router.navigate(['/waiting-approval']);
          }
        } else {
          // حساب مفعل ومقبول
          this.router.navigate(['/dashboard/home']);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'رمز التحقق غير صحيح أو انتهت صلاحيته';
      }
    });
  }

  resendOtp(): void {
    if (!this.email) return;

    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendOtp(this.email).subscribe({
      next: () => {
        this.successMessage = 'تم إعادة إرسال الكود بنجاح إلى بريدك';
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'فشل في إعادة الإرسال، حاول لاحقاً';
      }
    });
  }
}