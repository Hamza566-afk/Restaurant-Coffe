import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LanguageService, Language } from '../../services/language.service';

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
  
  password = signal<string>('');
  confirmPassword = signal<string>('');
  
  // Variables pour la visibilité des mots de passe
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  isLoading: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.email = localStorage.getItem('reset_email') || '';
    this.resetToken = localStorage.getItem('reset_token') || '';

    if (!this.email || !this.resetToken) {
      this.router.navigate(['/forgot-password']);
    }
  }

  setLanguage(lang: Language): void {
    this.langService.setLanguage(lang);
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  onSubmit(): void {
    const pwd = this.password();
    const confirmPwd = this.confirmPassword();

    if (pwd !== confirmPwd) {
      this.errorMessage = this.langService.t('auth.passwordMismatch');
      return;
    }

    if (pwd.length < 6) {
      this.errorMessage = this.langService.t('auth.passwordTooShort');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.resetPassword(this.email, this.resetToken, pwd).subscribe({
      next: () => {
        this.isLoading = false;
        // تنظيف البيانات المؤقتة
        localStorage.removeItem('reset_email');
        localStorage.removeItem('reset_token');
        
        alert(this.langService.t('auth.resetSuccessMsg'));
        this.router.navigate(['/login-owner']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || this.langService.t('auth.serverError');
      }
    });
  }
}