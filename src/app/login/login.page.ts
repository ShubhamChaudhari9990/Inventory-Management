import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  eyeOutline,
  eyeOffOutline,
  fingerPrintOutline,
  informationCircleOutline,
  keyOutline,
  leaf,
} from 'ionicons/icons';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
  ],
})
export class LoginPage implements OnInit {
  private readonly authService = inject(AuthService);

  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  readonly appVersion = 'v2.4.0';

  constructor() {
    addIcons({
      leaf,
      eyeOutline,
      eyeOffOutline,
      arrowForwardOutline,
      keyOutline,
      fingerPrintOutline,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    // Language is restored on app startup via LanguageService.
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onLogin(): void {
    void this.authService.loginWithPassword();
  }

  onPasskeyLogin(): void {
    void this.authService.loginWithPasskey();
  }

  onBiometricLogin(): void {
    void this.authService.loginWithBiometric();
  }
}
