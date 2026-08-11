import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth'; // ثبت في الـ path حسب مشروعك

@Component({
  selector: 'app-subscription-expired',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscription-expired.html',
  styleUrl: './subscription-expired.css'
})
export class SubscriptionExpiredComponent {
  constructor(private auth: AuthService) {}

  logout(): void {
    this.auth.performLogout('owner');
  }
}