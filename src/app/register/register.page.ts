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
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  businessOutline,
  callOutline,
  eyeOffOutline,
  eyeOutline,
  languageOutline,
  leaf,
  lockClosedOutline,
  mailOutline,
  personOutline,
} from 'ionicons/icons';

import { AppToastService } from '../shared/services/app-toast.service';

type StaffRole =
  | 'front_desk'
  | 'housekeeping'
  | 'kitchen'
  | 'manager'
  | 'maintenance';

interface RoleOption {
  value: StaffRole;
  labelKey: string;
}

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
    IonSelect,
    IonSelectOption,
    IonCheckbox,
    IonButton,
    IonIcon,
  ],
})
export class RegisterPage {
  private readonly router = inject(Router);
  private readonly appToast = inject(AppToastService);

  fullName = '';
  email = '';
  mobile = '';
  role: StaffRole | '' = '';
  password = '';
  confirmPassword = '';
  agreeTerms = false;
  showPassword = false;
  showConfirmPassword = false;

  readonly roles: RoleOption[] = [
    { value: 'front_desk', labelKey: 'REGISTER.ROLES.FRONT_DESK' },
    { value: 'housekeeping', labelKey: 'REGISTER.ROLES.HOUSEKEEPING' },
    { value: 'kitchen', labelKey: 'REGISTER.ROLES.KITCHEN' },
    { value: 'manager', labelKey: 'REGISTER.ROLES.MANAGER' },
    { value: 'maintenance', labelKey: 'REGISTER.ROLES.MAINTENANCE' },
  ];

  constructor() {
    addIcons({
      leaf,
      languageOutline,
      personOutline,
      mailOutline,
      callOutline,
      businessOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      arrowForwardOutline,
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
      !this.mobile.trim() ||
      !this.role
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

    await this.showToast('REGISTER.ERRORS.SUCCESS', 'success');
    await this.router.navigate(['/login']);
  }

  private async showToast(
    key: string,
    color: 'success' | 'warning' | 'danger' = 'warning',
  ): Promise<void> {
    await this.appToast.show(key, 2500, color);
  }
}
