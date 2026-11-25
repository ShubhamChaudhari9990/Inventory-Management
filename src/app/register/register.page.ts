import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  callOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  eyeOffOutline,
  eyeOutline,
  languageOutline,
  leaf,
  lockClosedOutline,
  mailOutline,
  mailUnreadOutline,
  personOutline,
  refreshOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

import { AppToastService } from '../shared/services/app-toast.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    IonContent,
    IonInput,
    IonItem,
    IonCheckbox,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class RegisterPage {
  private readonly router = inject(Router);
  private readonly appToast = inject(AppToastService);
  private readonly authService = inject(AuthService);

  fullName = '';
  email = '';
  mobile = '';
  password = '';
  confirmPassword = '';
  agreeTerms = false;
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  registrationCompleted = false;

  constructor() {
    addIcons({
      leaf,
      languageOutline,
      personOutline,
      mailOutline,
      callOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      arrowForwardOutline,
      checkmarkCircleOutline,
      mailUnreadOutline,
      refreshOutline,
      shieldCheckmarkOutline,
      closeCircleOutline,
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onRegister(): Promise<void> {
    if (
      !this.fullName.trim() ||
      !this.email.trim() ||
      !this.mobile.trim()
    ) {
      await this.showToast('REGISTER.ERRORS.REQUIRED', 'warning');
      return;
    }

    if (this.password.length < 8) {
      await this.showToast('REGISTER.ERRORS.PASSWORD_LENGTH', 'warning');
      return;
    }

    if (this.password !== this.confirmPassword) {
      await this.showToast('REGISTER.ERRORS.PASSWORD_MISMATCH', 'warning');
      return;
    }

    if (!this.agreeTerms) {
      await this.showToast('REGISTER.ERRORS.TERMS', 'warning');
      return;
    }

    this.isSubmitting = true;
    try {
      const res = await this.authService.registerWithEmailPassword({
        fullName: this.fullName,
        email: this.email,
        mobile: this.mobile,
        password: this.password,
      });

      if (res.success) {
        this.registrationCompleted = true;
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  async onResendVerification(): Promise<void> {
    await this.authService.resendVerificationEmail();
  }

  onGoToLogin(): void {
    void this.router.navigate(['/login'], {
      queryParams: { email: this.email },
    });
  }

  private async showToast(
    key: string,
    color: 'success' | 'warning' | 'danger' = 'warning',
  ): Promise<void> {
    await this.appToast.show(key, 2500, color);
  }
}
