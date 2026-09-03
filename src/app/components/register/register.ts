import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CaptchaComponent } from '../captcha/captcha';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CaptchaComponent],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  userData = {
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    shop_name: '',
    subdomain: ''
  };

  selectedLogo: File | null = null;
  showPassword = false;
  showConfirmPassword = false;
  isCaptchaValid = false;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onCaptchaStatusChange(status: boolean) {
    this.isCaptchaValid = status;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedLogo = input.files[0];
    } else {
      this.selectedLogo = null;
    }
  }

  onRegister(): void {
    if (!this.isCaptchaValid) return;

    if (this.userData.password !== this.userData.password_confirmation) {
      alert('كلمة السر وتأكيد كلمة السر غير متطابقين');
      return;
    }

    this.isLoading = true;
    this.authService.getCsrfCookie().subscribe({
      next: () => {
        const payload = new FormData();
        payload.append('name', this.userData.name);
        payload.append('email', this.userData.email);
        payload.append('password', this.userData.password);
        payload.append('password_confirmation', this.userData.password_confirmation);
        payload.append('shop_name', this.userData.shop_name);
        payload.append('subdomain', this.userData.subdomain);

        if (this.selectedLogo) {
          payload.append('logo', this.selectedLogo, this.selectedLogo.name);
        }

        this.authService.register(payload).subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/legal-terms']);
          },
          error: (err) => {
            this.isLoading = false;
            alert(err?.error?.message ?? 'خطأ في التسجيل');
          }
        });
      },
      error: () => {
        this.isLoading = false;
        alert('خطأ في الاتصال بالخادم');
      }
    });
  }
}