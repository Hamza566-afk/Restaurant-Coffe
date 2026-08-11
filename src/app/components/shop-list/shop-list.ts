import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // 1. أضفنا الـ Router
import { Shop } from '../../services/shop';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-shop-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop-list.html',
  styleUrls: ['./shop-list.css']
})
export class ShopListComponent implements OnInit {
  shops: any[] = [];

  constructor(
    private shopService: Shop, 
    private authService: AuthService,
    private router: Router // 2. أضفناه للـ Constructor
  ) {}

  ngOnInit() {
    this.shopService.getShops().subscribe({
      next: (res: any) => {
        this.shops = res.data;
      },
      error: (err) => {
        // 3. التحقق من حالة الـ 401
        if (err.status === 401) {
          this.router.navigate(['/login']);
        } else {
          console.error('Error fetching shops', err);
        }
      }
    });
  }

  logout() {
    this.authService.performLogout('admin');
  }

  toggle(id: number) {
    // 1. التحديث البصري الفوري (Optimistic Update)
    const shop = this.shops.find(s => s.id === id);
    if (shop) {
        shop.is_active = !shop.is_active;
    }

    // 2. التحديث في قاعدة البيانات مع الحماية
    this.shopService.toggleStatus(id).subscribe({
      next: () => console.log('Status updated in Database'),
      error: (err) => {
        // 4. الحماية حتى أثناء التحديث
        if (err.status === 401) {
          this.router.navigate(['/login']);
        } else {
          console.error('Update failed', err);
          // في حالة الخطأ، نرجع الحالة كما كانت
          if (shop) shop.is_active = !shop.is_active;
        }
      }
    });
  }

  // 🗑️ ميثود الحذف الجديدة والمربوطة بالزر
  deleteShop(id: number) {
    const confirmDelete = confirm('هل أنت متأكد من حذف هذه القهوة نهائياً؟ كل البيانات التابعة لها ستُحذف!');
    
    if (confirmDelete) {
      this.shopService.deleteShop(id).subscribe({
        next: () => {
          console.log('Shop deleted successfully');
          // نحيو الـ shop مالـ array في الواجهة ديريكت باش تختفي من الجدول
          this.shops = this.shops.filter(s => s.id !== id);
        },
        error: (err) => {
          if (err.status === 401) {
            this.router.navigate(['/login']);
          } else {
            console.error('Delete failed', err);
            alert('حدث خطأ أثناء محاولة الحذف.');
          }
        }
      });
    }
  }
}