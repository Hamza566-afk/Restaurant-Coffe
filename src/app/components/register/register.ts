import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
    country_code: '',
    phone_prefix: '',
    currency_code: '',
    timezone: '',
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadCountriesAndDetectLocation();
  }

  loadCountriesAndDetectLocation(): void {
    // 1. Njiboo l-countries mel backend mta3ek wala mel API
    this.authService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = res?.data || res || [];

        // 2. Na3mlou detection automatique mel IP b-ipapi.co
        this.detectUserCountry();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des pays:', err);
      }
    });
  }

  detectUserCountry(): void {
    this.http.get<any>('https://ipapi.co/json/').subscribe({
      next: (geo) => {
        const detectedCode = geo?.country_code; // e.g., 'FR', 'SA', 'TN'
        const found = this.countries.find(c => c.code === detectedCode);

        if (found) {
          this.applyCountry(found, geo?.timezone);
        } else {
          this.setDefaultCountry();
        }
      },
      error: () => {
        this.setDefaultCountry();
      }
    });
  }

  onCountryChange(): void {
    const selected = this.countries.find(c => c.id == this.userData.country_id);
    if (selected) {
      this.applyCountry(selected);
    }
  }

  private applyCountry(country: any, detectedTimezone?: string): void {
    this.userData.country_id = country.id;
    this.userData.country_code = country.code;
    this.userData.phone_prefix = country.phone_code || country.phone_prefix;
    this.userData.currency_code = country.currency_code || country.currency || 'TND';
    this.userData.timezone = detectedTimezone || country.timezone || 'Africa/Tunis';
    this.selectedPhoneCode = this.userData.phone_prefix;
  }

  private setDefaultCountry(): void {
    const defaultCountry = this.countries.find(c => c.code === 'TN') || this.countries[0];
    if (defaultCountry) {
      this.applyCountry(defaultCountry);
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
        payload.append('country_code', this.userData.country_code);
        payload.append('phone_prefix', this.userData.phone_prefix);
        payload.append('currency_code', this.userData.currency_code);
        payload.append('timezone', this.userData.timezone);
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