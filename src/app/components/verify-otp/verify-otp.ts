import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
export class VerifyOtpComponent implements OnInit, OnDestroy {
  public langService = inject(LanguageService);

  email: string = '';
  otpDigits: string[] = ['', '', '', '', '', ''];
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  isResending: boolean = false;

  // ⏱️ إعدادات الـ Timer لـ 5 دقائق (300 ثانية)
  timeLeft: number = 300; 
  canResend: boolean = false;
  timerInterval: any;

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
      } else {
        this.startTimer(); // بداية العد التنازلي عند فتح الصفحة
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer(); // تنظيف الـ Interval عند الخروج من الصفحة
  }

  // ⏱️ دالة تشغيل العداد
  startTimer(): void {
    this.stopTimer();
    this.timeLeft = 300; // 5 دقائق
    this.canResend = false;

    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.canResend = true;
        this.stopTimer();
        this.errorMessage = this.langService.t('auth.otpExpiredError') || 'انتهت صلاحية الرمز. يرجى طلب رمز جديد.';
      }
    }, 1000);
  }

  // ⏱️ دالة إيقاف العداد
  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // ⏱️ تحويل الثواني إلى صيغة دقائق وثواني (MM:SS)
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, ''); // أرقام فقط

    if (val.length > 0) {
      const lastChar = val.charAt(val.length - 1);
      this.otpDigits[index] = lastChar;
      input.value = lastChar;

      // نقل الـ Focus للخانة التالية
      if (index < 5) {
        setTimeout(() => {
          const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }, 10);
      }
    } else {
      this.otpDigits[index] = '';
    }
  }

  // 🧹 تحسين زر الفسخ (Backspace) لفسخ الرقم والرجوع للخانة السابقة بسلاسة متواصلة
  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const input = event.target as HTMLInputElement;

      if (input.value) {
        // 1. إذا كان بالخانة الحالية قيمة: افسخ القيمة وارجع فوراً للخانة السابقة
        event.preventDefault();
        this.otpDigits[index] = '';
        input.value = '';

        if (index > 0) {
          const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
          if (prevInput) {
            prevInput.focus();
          }
        }
      } else if (index > 0) {
        // 2. إذا كانت الخانة فارغة بالأساس: ارجع للخانة السابقة، افسخ ما فيها وحول الـ Focus إليها
        event.preventDefault();
        this.otpDigits[index - 1] = '';
        const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.value = '';
          prevInput.focus();
        }
      }
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').replace(/\D/g, '').trim() || '';
    if (pastedData.length >= 6) {
      for (let i = 0; i < 6; i++) {
        this.otpDigits[i] = pastedData[i];
        const el = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
        if (el) el.value = pastedData[i];
      }
      const lastInput = document.getElementById(`otp-input-5`) as HTMLInputElement;
      if (lastInput) lastInput.focus();
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d !== '' && d !== null && d !== undefined);
  }

  onVerify(): void {
    // 🛑 منع الإرسال إذا انتهى الوقت قبل التحقق من الـ API
    if (this.timeLeft === 0 && !this.canResend) {
      this.errorMessage = this.langService.t('auth.otpExpiredError') || 'انتهت صلاحية الرمز. يرجى طلب رمز جديد.';
      return;
    }

    const fullOtp = this.otpDigits.join('');
    if (fullOtp.length !== 6) {
      this.errorMessage = this.langService.t('auth.otpIncompleteError');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyOtp(this.email, fullOtp).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.stopTimer();
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
        this.errorMessage = err?.error?.message || this.langService.t('auth.otpInvalidError');
      }
    });
  }

  resendOtp(): void {
    if (!this.email || this.isResending || !this.canResend) return;

    this.isResending = true;
    this.errorMessage = '';
    this.successMessage = '';

    // 🧹 تفريغ الواجهة من الأرقام القديمة
    this.resetOtpFields();

    this.authService.sendOtp(this.email).subscribe({
      next: () => {
        this.isResending = false;
        this.successMessage = this.langService.t('auth.otpResendSuccess');
        this.startTimer(); // إعادة العداد لـ 5 دقائق من جديد
      },
      error: (err: any) => {
        this.isResending = false;
        this.errorMessage = err?.error?.message || this.langService.t('auth.otpResendError');
      }
    });
  }

  // 🧹 دالة تصفير الخانات بالكامل
  private resetOtpFields(): void {
    this.otpDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (input) input.value = '';
    }
    const firstInput = document.getElementById('otp-input-0') as HTMLInputElement;
    if (firstInput) firstInput.focus();
  }
}