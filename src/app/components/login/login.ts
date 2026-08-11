import { Component } from '@angular/core';
import { AuthService } from '../../services/auth'; // تأكد أن اسم الملف هو auth.service.ts
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  email = '';
  password = '';

  constructor(private auth: AuthService, private router: Router) {}

 onLogin() {
  // 1. طلب الـ Cookie أولاً
  this.auth.getCsrfCookie().subscribe({
    next: () => {
      // 2. إذا نجح الطلب الأول، نبعث الـ Login
      this.auth.login({ email: this.email, password: this.password }).subscribe({
        next: (res: any) => {
          // Admin should go to /admin/shops
          this.router.navigate(['/admin/shops']);
        },
       error: (err) => {
          // هذا السطر سيكشف لك لماذا يرفض السيرفر (مثلاً: "Invalid credentials")
          console.log('Server Error Body:', err.error);
        }
      });
    },
    error: (err) => console.log('CSRF Error:', err)
  });
}
}

