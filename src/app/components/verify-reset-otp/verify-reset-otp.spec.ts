import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyResetOtp } from './verify-reset-otp';

describe('VerifyResetOtp', () => {
  let component: VerifyResetOtp;
  let fixture: ComponentFixture<VerifyResetOtp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyResetOtp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyResetOtp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
