import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LanguageService, Language } from '../../services/language.service';

@Component({
  selector: 'app-verify-reset-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verify-reset-otp.html',
  styleUrls: ['./verify-reset-otp.css']
})
export class VerifyResetOtpComponent implements OnInit, OnDestroy {
  public langService = inject(LanguageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  otpDigits: string[] = ['', '', '', '', '', ''];
  errorMessage: string = '';
  isLoading: boolean = false;
  isResending: boolean = false;

  // Timer Variables (5 minutes = 300s)
  timerSeconds: number = 300;
  timerInterval: any = null;
  isExpired: boolean = false;

  ngOnInit(): void {
    this.email = localStorage.getItem('reset_email') || '';
    if (!this.email) {
      this.router.navigate(['/forgot-password']);
      return;
    }
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startTimer(): void {
    this.stopTimer();
    this.timerSeconds = 300; // 5 minutes
    this.isExpired = false;

    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
      } else {
        this.isExpired = true;
        this.stopTimer();
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  setLanguage(lang: Language): void {
    this.langService.setLanguage(lang);
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '');

    if (val.length > 0) {
      const lastChar = val.charAt(val.length - 1);
      this.otpDigits[index] = lastChar;
      input.value = lastChar;

      // Focus on next input
      if (index < 5) {
        const nextInput = document.getElementById(`reset-otp-${index + 1}`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
    } else {
      this.otpDigits[index] = '';
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      event.preventDefault(); // Stop default backspace action

      if (this.otpDigits[index] !== '') {
        // Clear current input
        this.otpDigits[index] = '';
        const currentInput = event.target as HTMLInputElement;
        currentInput.value = '';
      } else if (index > 0) {
        // Focus previous input and clear it
        this.otpDigits[index - 1] = '';
        const prevInput = document.getElementById(`reset-otp-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.value = '';
          prevInput.focus();
        }
      }
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d !== '');
  }

  resendOtp(): void {
    if (this.isResending) return;

    this.isResending = true;
    this.errorMessage = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.isResending = false;
        this.otpDigits = ['', '', '', '', '', ''];
        this.startTimer();
      },
      error: (err) => {
        this.isResending = false;
        this.errorMessage = err?.error?.message || this.langService.t('auth.otpResendError');
      }
    });
  }

  onVerify(): void {
    if (this.isExpired) {
      this.errorMessage = this.langService.t('auth.otpExpiredError');
      return;
    }

    const fullOtp = this.otpDigits.join('');
    if (fullOtp.length !== 6) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verifyResetOtp(this.email, fullOtp).subscribe({
      next: (res) => {
        this.isLoading = false;
        localStorage.setItem('reset_token', res.reset_token);
        this.router.navigate(['/reset-password']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || this.langService.t('auth.otpInvalidError');
      }
    });
  }
}