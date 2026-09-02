import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.email = localStorage.getItem('pending_otp_email') || '';
    if (!this.email) {
      this.router.navigate(['/login']);
    }
  }

  onVerify(): void {
    if (this.otpCode.length !== 6) {
      this.errorMessage = 'الرجاء إدخال كود متكون من 6 أرقام';
      return;
    }

    this.authService.verifyOtp(this.email, this.otpCode).subscribe({
      next: () => {
        localStorage.removeItem('pending_otp_email');
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => { // ✅ صلحنا التايب متاع err هنا
        this.errorMessage = err?.error?.message || 'رمز التحقق غير صحيح';
      }
    });
  }

  resendOtp(): void {
    this.authService.sendOtp(this.email).subscribe({
      next: () => {
        this.successMessage = 'تم إعادة إرسال الكود بنجاح';
      },
      error: (err: any) => { // ✅ صلحنا التايب متاع err هنا
        this.errorMessage = 'فشل في إعادة الإرسال';
      }
    });
  }
}