import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-verify-reset-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verify-reset-otp.html',
  styleUrls: ['./verify-reset-otp.css']
})
export class VerifyResetOtpComponent implements OnInit {
  public langService = inject(LanguageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  otpDigits: string[] = ['', '', '', '', '', ''];
  errorMessage: string = '';
  isLoading: boolean = false;

  ngOnInit(): void {
    this.email = localStorage.getItem('reset_email') || '';
    if (!this.email) {
      this.router.navigate(['/forgot-password']);
    }
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '');

    if (val.length > 0) {
      const lastChar = val.charAt(val.length - 1);
      this.otpDigits[index] = lastChar;
      input.value = lastChar;

      if (index < 5) {
        setTimeout(() => {
          const nextInput = document.getElementById(`reset-otp-${index + 1}`) as HTMLInputElement;
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

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const input = event.target as HTMLInputElement;
      if (!input.value && index > 0) {
        this.otpDigits[index - 1] = '';
        const prevInput = document.getElementById(`reset-otp-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          prevInput.value = '';
        }
      } else {
        this.otpDigits[index] = '';
      }
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d !== '');
  }

  onVerify(): void {
    const fullOtp = this.otpDigits.join('');
    if (fullOtp.length !== 6) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verifyResetOtp(this.email, fullOtp).subscribe({
      next: (res) => {
        this.isLoading = false;
        // حفظ الـ Token المؤقت للاستعمال في الصفحة التالية
        localStorage.setItem('reset_token', res.reset_token);
        this.router.navigate(['/reset-password']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'رمز التحقق خاطئ أو انتهت صلاحيته';
      }
    });
  }
}