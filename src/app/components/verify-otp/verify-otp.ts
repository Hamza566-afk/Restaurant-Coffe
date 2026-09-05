import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

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
  isResending: boolean = false;

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

  // التحكم في التنقل التلقائي بين الخانات عند الكتابة
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

  // العودة للخانة السابقة عند الضغط على Backspace
  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = (event.target as HTMLElement).previousElementSibling as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  // دعم لشق الكود كاملاً (Paste)
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').trim() || '';
    if (/^\d{6}$/.test(pastedData)) {
      for (let i = 0; i < 6; i++) {
        this.otpDigits[i] = pastedData[i];
      }
    }
  }

  // التثبت هل تم ملء الخانات الستة بالكامل
  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d !== null && d !== undefined && d.trim() !== '');
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
        this.errorMessage = err?.error?.message || this.langService.t('auth.otpInvalidError') || 'رمز التحقق غير صحيح أو انتهت صلاحيته';
      }
    });
  }

  resendOtp(): void {
    if (!this.email || this.isResending) return;

    this.isResending = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendOtp(this.email).subscribe({
      next: () => {
        this.isResending = false;
        this.successMessage = this.langService.t('auth.otpResendSuccess') || 'تم إعادة إرسال الكود بنجاح إلى بريدك';
      },
      error: (err: any) => {
        this.isResending = false;
        this.errorMessage = err?.error?.message || this.langService.t('auth.otpResendError') || 'فشل في إعادة الإرسال، حاول لاحقاً';
      }
    });
  }
}