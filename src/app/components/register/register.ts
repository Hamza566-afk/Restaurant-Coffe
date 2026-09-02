import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
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

  /** 🚀 Optional logo file selected by the user */
  selectedLogo: File | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  /** 🚀 Capture the selected logo file from the input */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedLogo = input.files[0];
    } else {
      this.selectedLogo = null;
    }
  }

  onRegister(): void {
    if (this.userData.password !== this.userData.password_confirmation) {
      alert('كلمة السر وتأكيد كلمة السر غير متطابقين');
      return;
    }

    this.authService.getCsrfCookie().subscribe({
      next: () => {
        // ✅ Build a FormData payload so File objects are sent as multipart
        const payload = new FormData();
        payload.append('name', this.userData.name);
        payload.append('email', this.userData.email);
        payload.append('password', this.userData.password);
        payload.append('password_confirmation', this.userData.password_confirmation);
        payload.append('shop_name', this.userData.shop_name);
        payload.append('subdomain', this.userData.subdomain);

        // 🚀 Append the logo only if one was selected
        if (this.selectedLogo) {
          payload.append('logo', this.selectedLogo, this.selectedLogo.name);
        }

        this.authService.register(payload).subscribe({
          // ⚖️ التوجيه الجديد لصفحة الشروط والملكية الفكرية بدلاً من صفحة الدخول
          next: () => this.router.navigate(['/legal-terms']),
          error: (err) => alert(err?.error?.message ?? 'خطأ في التسجيل')
        });
      },
      error: () => alert('خطأ في الاتصال بالخادم')
    });
  }
}