import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionExpired } from './subscription-expired';

describe('SubscriptionExpired', () => {
  let component: SubscriptionExpired;
  let fixture: ComponentFixture<SubscriptionExpired>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionExpired]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriptionExpired);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
