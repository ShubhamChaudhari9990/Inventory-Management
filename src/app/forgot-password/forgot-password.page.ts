import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
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
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  checkmarkCircleOutline,
  leaf,
  mailOutline,
  paperPlaneOutline,
  refreshOutline,
} from 'ionicons/icons';

import { AuthService } from '../services/auth.service';
import { AppToastService } from '../shared/services/app-toast.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
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
export class ForgotPasswordPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(AppToastService);
  private readonly route = inject(ActivatedRoute);

  email = '';
  readonly isSubmitting = signal(false);
  readonly isEmailSent = signal(false);
  readonly sentEmail = signal('');

  constructor() {
    addIcons({
      leaf,
      mailOutline,
      arrowBackOutline,
      paperPlaneOutline,
      checkmarkCircleOutline,
      arrowForwardOutline,
      refreshOutline,
    });
  }

  ngOnInit(): void {
    const qEmail = this.route.snapshot.queryParamMap.get('email');
    if (qEmail) {
      this.email = qEmail.trim();
    }
  }

  async onSubmit(): Promise<void> {
    const trimmed = this.email.trim();
    if (!trimmed) {
      await this.toast.show('FORGOT.ERRORS.EMAIL_REQUIRED', 2500, 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      await this.toast.show('FORGOT.ERRORS.INVALID_EMAIL', 2500, 'warning');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const res = await this.authService.sendPasswordReset(trimmed);
      if (res.success) {
        this.sentEmail.set(trimmed);
        this.isEmailSent.set(true);
        await this.toast.show('FORGOT.SUCCESS_TITLE', 3000, 'success');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onResend(): Promise<void> {
    if (!this.sentEmail()) return;
    this.isSubmitting.set(true);
    try {
      const res = await this.authService.sendPasswordReset(this.sentEmail());
      if (res.success) {
        await this.toast.show('FORGOT.SUCCESS_TITLE', 3000, 'success');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onResetAnother(): void {
    this.email = '';
    this.isEmailSent.set(false);
  }
}
