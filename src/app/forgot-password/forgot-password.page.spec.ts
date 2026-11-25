import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { ForgotPasswordPage } from './forgot-password.page';

describe('ForgotPasswordPage', () => {
  let component: ForgotPasswordPage;
  let fixture: ComponentFixture<ForgotPasswordPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [provideTranslateService(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty email and isEmailSent false', () => {
    expect(component.email).toBe('');
    expect(component.isEmailSent()).toBeFalse();
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should reset state on onResetAnother', () => {
    component.email = 'test@example.com';
    component.isEmailSent.set(true);

    component.onResetAnother();

    expect(component.email).toBe('');
    expect(component.isEmailSent()).toBeFalse();
  });
});
