import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register'; // تأكد أن هذا هو اسم الملف بالضبط

describe('RegisterComponent', () => { // نصيحة: سمي الـ describe باسم الـ Component
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // هنا الغلطة: بما أنه Standalone، لازم تحط الـ Component في الـ imports
      imports: [RegisterComponent] 
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});