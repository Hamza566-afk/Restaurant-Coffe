import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-waiting-approval',
  standalone: true,
  templateUrl: './waiting-approval.html'
})
export class WaitingApprovalComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  /** دالة للتأكد هل قام الـ Admin بتفعيل الحساب أم لا */
  checkStatus(): void {
    this.authService.checkCurrentUserStatus().subscribe({
      next: (response) => {
        if (response.shop && response.shop.is_active) {
          // إذا تفعّل الحساب، نوجّهوه للـ Dashboard ديريكت
          this.router.navigate(['/dashboard/home']);
        } else {
          // إذا مازال، نخرجوا Alert صغير
          alert('حسابك ما زال قيد المراجعة، سنقوم بتفعيله قريباً!');
        }
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login-owner'])
    });
  }
}