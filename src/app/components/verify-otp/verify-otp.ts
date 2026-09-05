import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service'; // ثبت في المسار

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './verify-otp.html',
  styleUrls: ['./verify-otp.css']
})
export class VerifyOtpComponent implements OnInit {
  public langService = inject(LanguageService);

  email: string = '';
  otpDigits: string[] = ['', '', '', '', '', '']; // 6 خانات منفصلة
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || localStorage.getItem('pending_otp_email') || '';
      if (!this.email) {
        this.router.navigate(['/login-owner']);
      }
    });
  }

  // التحكم في التنقل التلقائي بين الخانات
  onDigitInput(event: any, index: number): void {
    const input = event.target;
    const val = input.value;

    // قبول أرقام فقط
    if (!/^\d*$/.test(val)) {
      this.otpDigits[index] = '';
      return;
    }

    // التنقل للخانة الموالية عند كتابة رقم
    if (val && index < 5) {
      const nextInput = input.nextElementSibling;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    // العودة للخانة السابقة عند الضغط على Backspace
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = (event.target as HTMLElement).previousElementSibling as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').trim() || '';
    if (/^\d{6}$/.test(pastedData)) {
      for (let i = 0; i < 6; i++) {
        this.otpDigits[i] = pastedData[i];
      }
    }
  }

  onVerify(): void {
    const fullOtp = this.otpDigits.join('');
    if (fullOtp.length !== 6) {
      this.errorMessage = this.langService.t('auth.otpIncompleteError') || 'الرجاء إدخال كود متكون من 6 أرقام';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyOtp(this.email, fullOtp).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        localStorage.removeItem('pending_otp_email');

        const shop = res?.shop;
        if (shop && !shop.is_active) {
          const hasSubscriptions = shop.subscriptions && shop.subscriptions.length > 0;
          if (hasSubscriptions) {
            this.router.navigate(['/subscription-expired']);
          } else {
            this.router.navigate(['/waiting-approval']);
          }
        } else {
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