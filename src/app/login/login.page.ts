import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  NgZone,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
  LoadingController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  chevronDownOutline,
  closeCircleOutline,
  eyeOffOutline,
  eyeOutline,
  informationCircleOutline,
  languageOutline,
  leaf,
  lockClosedOutline,
  mailOutline,
  refreshOutline,
  warningOutline,
} from 'ionicons/icons';

import { AuthService } from '../services/auth.service';
import { AppToastService } from '../shared/services/app-toast.service';
import { AppLanguage, LanguageService } from '../services/language.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    IonContent,
    IonInput,
    IonItem,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class LoginPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly translate = inject(TranslateService);
  private readonly appToast = inject(AppToastService);

  email = '';
  password = '';
  showPassword = false;
  readonly appVersion = 'v2.4.0';

  readonly isSubmitting = signal(false);
  readonly isGoogleSubmitting = signal(false);
  readonly showVerificationAlert = signal(false);
  readonly isLanguageMenuOpen = signal(false);
  readonly currentLanguage = this.languageService.currentLanguage;

  readonly languageOptions = [
    { code: 'en' as const, label: 'English', nativeName: 'English' },
    { code: 'mr' as const, label: 'Marathi', nativeName: 'मराठी' },
  ];

  constructor() {
    addIcons({
      leaf,
      eyeOutline,
      eyeOffOutline,
      arrowForwardOutline,
      informationCircleOutline,
      mailOutline,
      refreshOutline,
      warningOutline,
      closeCircleOutline,
      languageOutline,
      chevronDownOutline,
      lockClosedOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe((params) => {
      if (params['email']) {
        this.email = params['email'];
        this.cdr.markForCheck();
      }
      if (params['unverified'] === 'true') {
        this.showVerificationAlert.set(true);
        this.cdr.markForCheck();
      }
    });

    if (this.authService.pendingVerificationEmail()) {
      this.showVerificationAlert.set(true);
      if (!this.email) {
        this.email = this.authService.pendingVerificationEmail() || '';
      }
      this.cdr.markForCheck();
    }
  }

  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.isLanguageMenuOpen.update((open) => !open);
  }

  async selectLanguage(code: AppLanguage, event: Event): Promise<void> {
    event.stopPropagation();
    this.isLanguageMenuOpen.set(false);
    await this.languageService.setLanguage(code);
    this.cdr.markForCheck();
  }

  closeLanguageMenu(): void {
    if (this.isLanguageMenuOpen()) {
      this.isLanguageMenuOpen.set(false);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onLogin(): Promise<void> {
    if (this.isSubmitting() || this.isGoogleSubmitting()) return;

    const emailTrimmed = this.email?.trim();
    const passTrimmed = this.password?.trim();

    if (!emailTrimmed || !passTrimmed) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 3000, 'warning');
      return;
    }

    this.showVerificationAlert.set(false);
    this.isSubmitting.set(true);

    let loader: HTMLIonLoadingElement | null = null;
    try {
      loader = await this.loadingCtrl.create({
        message: this.translate.instant('LOGIN.AUTHENTICATING'),
        spinner: 'crescent',
        backdropDismiss: false,
      });
      await loader.present();
    } catch {}

    try {
      const res = await this.authService.loginWithPassword(emailTrimmed, passTrimmed);
      if (res && res.reason === 'EMAIL_NOT_VERIFIED') {
        this.showVerificationAlert.set(true);
      }
    } catch (e: any) {
      console.warn('Login error:', e);
      const msg = e?.message || 'Login failed. Please check your credentials.';
      await this.appToast.show(msg, 3500, 'danger');
    } finally {
      if (loader) {
        try {
          await loader.dismiss();
        } catch {}
      }
      this.ngZone.run(() => {
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      });
    }
  }

  async onGoogleLogin(): Promise<void> {
    if (this.isGoogleSubmitting() || this.isSubmitting()) return;
    this.showVerificationAlert.set(false);
    this.isGoogleSubmitting.set(true);

    let loader: HTMLIonLoadingElement | null = null;
    try {
      loader = await this.loadingCtrl.create({
        message: this.translate.instant('LOGIN.GOOGLE_LOADING'),
        spinner: 'crescent',
        backdropDismiss: false,
      });
      await loader.present();
    } catch {}

    try {
      const res = await this.authService.loginWithGoogle();
      if (res && !res.success) {
        if (res.reason === 'USER_CANCELLED') {
          await this.appToast.show('AUTH.GOOGLE_CANCELLED', 2000, 'warning');
        } else if (res.message) {
          await this.appToast.show(res.message, 3500, 'danger');
        }
      }
    } catch (e: any) {
      console.warn('Google login error:', e);
      const msg = e?.message || 'Google sign-in failed. Please try again.';
      await this.appToast.show(msg, 3500, 'danger');
    } finally {
      if (loader) {
        try {
          await loader.dismiss();
        } catch {}
      }
      this.ngZone.run(() => {
        this.isGoogleSubmitting.set(false);
        this.cdr.markForCheck();
      });
    }
  }

  async onResendVerification(): Promise<void> {
    await this.authService.resendVerificationEmail();
  }

  dismissVerificationAlert(): void {
    this.showVerificationAlert.set(false);
  }
}
