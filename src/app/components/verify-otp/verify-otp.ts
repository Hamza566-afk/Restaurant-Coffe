import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

  email: string = '';
  otpDigits: string[] = ['', '', '', '', '', ''];
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

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const rawVal = input.value;
    const digitsOnly = rawVal.replace(/\D/g, '');

    if (digitsOnly.length > 0) {
      const lastDigit = digitsOnly.charAt(digitsOnly.length - 1);
      this.otpDigits[index] = lastDigit;
      input.value = lastDigit;

      if (index < 5) {
        const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    } else {
      this.otpDigits[index] = '';
      input.value = '';
    }

    this.cdr.detectChanges();
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (!this.otpDigits[index] && index > 0) {
        event.preventDefault();
        const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          this.otpDigits[index - 1] = '';
          prevInput.value = '';
          prevInput.focus();
          this.cdr.detectChanges();
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
      this.cdr.detectChanges();
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d !== '' && d !== null && d !== undefined);
  }

  onVerify(): void {
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
    if (!this.email || this.isResending) return;

    this.isResending = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendOtp(this.email).subscribe({
      next: () => {
        this.isResending = false;
        this.successMessage = this.langService.t('auth.otpResendSuccess');
      },
      error: (err: any) => {
        this.isResending = false;
        this.errorMessage = err?.error?.message || this.langService.t('auth.otpResendError');
      }
    });
  }
}