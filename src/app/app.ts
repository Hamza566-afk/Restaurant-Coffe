import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // نخليوا هذي برك

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // نحينا المكونات الأخرى
  template: `<router-outlet></router-outlet>`, // الـ Router هو اللي باش يبدل الصفحات
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('cafe-admin-app');
}