import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  public langService = inject(LanguageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  onSubmit(): void {
    if (!this.email) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.isLoading = false;
        // حفظ الإيميل في Local Storage للاستعمال في الصفحة التالية
        localStorage.setItem('reset_email', this.email);
        this.router.navigate(['/verify-reset-otp']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || this.langService.t('auth.serverError');
      }
    });
  }
}