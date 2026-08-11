import { TestBed } from '@angular/core/testing';
import { ShopListComponent } from './shop-list'; // تأكد من المسار الصحيح
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ShopListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShopListComponent], // بما أنه Standalone، يوضع هنا
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
        // أضف أي خدمات أخرى يحتاجها الـ constructor هنا
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ShopListComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});