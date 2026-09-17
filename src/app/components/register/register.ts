import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CaptchaComponent } from '../captcha/captcha';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CaptchaComponent],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnInit {
  public langService = inject(LanguageService);

  userData = {
    name: '',
    email: '',
    phone: '',
    country_id: null as number | null,
    password: '',
    password_confirmation: '',
    shop_name: '',
    subdomain: ''
  };

  countries: any[] = [];
  selectedPhoneCode: string = '';
  selectedLogo: File | null = null;
  showPassword = false;
  showConfirmPassword = false;
  isCaptchaValid = false;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries(): void {
    this.authService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = res?.data || res || [];

        // اختيار تونس كبلد افتراضي إذا كانت موجودة في القائمة
        const defaultCountry = this.countries.find(c => c.code === 'TN') || this.countries[0];
        if (defaultCountry) {
          this.userData.country_id = defaultCountry.id;
          this.selectedPhoneCode = defaultCountry.phone_code;
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des pays:', err);
      }
    });
  }

  onCountryChange(): void {
    const selected = this.countries.find(c => c.id == this.userData.country_id);
    if (selected) {
      this.selectedPhoneCode = selected.phone_code;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onCaptchaStatusChange(status: boolean): void {
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

    if (!this.userData.country_id) {
      alert(this.langService.t('auth.countryRequired') || 'يرجى اختيار البلد');
      return;
    }

    if (this.userData.password !== this.userData.password_confirmation) {
      alert(this.langService.t('auth.passwordMismatch'));
      return;
    }

    this.isLoading = true;
    this.authService.getCsrfCookie().subscribe({
      next: () => {
        const payload = new FormData();
        payload.append('name', this.userData.name);
        payload.append('email', this.userData.email);
        payload.append('phone', this.userData.phone);
        payload.append('country_id', String(this.userData.country_id));
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
            const errorMsg = err?.error?.message || this.langService.t('auth.registerError');
            alert(errorMsg);
          }
        });
      },
      error: () => {
        this.isLoading = false;
        alert(this.langService.t('auth.serverError'));
      }
    });
  }
}