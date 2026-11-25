import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  warningOutline,
} from 'ionicons/icons';

@Injectable({ providedIn: 'root' })
export class AppToastService {
  private activeToast: HTMLIonToastElement | null = null;
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);

  constructor() {
    addIcons({
      alertCircleOutline,
      checkmarkCircleOutline,
      warningOutline,
    });
  }

  async show(
    messageKey: string,
    duration = 3000,
    color: 'success' | 'warning' | 'danger' = 'success',
  ): Promise<void> {
    let displayMessage = this.translate.instant(messageKey);
    if (!displayMessage || displayMessage === messageKey) {
      displayMessage = messageKey;
    }

    // 1. On Native Android / iOS, trigger Native Capacitor OS Toast
    if (Capacitor.isNativePlatform()) {
      try {
        await Toast.show({
          text: displayMessage,
          duration: duration > 2500 ? 'long' : 'short',
          position: 'bottom',
        });
        return;
      } catch (nativeErr) {
        console.warn('Native Capacitor Toast warning:', nativeErr);
      }
    }

    // 2. Web / PWA fallback styled as a crisp Capacitor-style centered pill toast
    try {
      await this.activeToast?.dismiss();

      const icon =
        color === 'danger'
          ? 'alert-circle-outline'
          : color === 'warning'
            ? 'warning-outline'
            : 'checkmark-circle-outline';

      const toast = await this.toastController.create({
        message: displayMessage,
        duration,
        icon,
        position: 'bottom',
        cssClass: ['app-toast', 'app-toast--capacitor', `app-toast--${color}`],
      });

      this.activeToast = toast;
      await toast.present();

      void toast.onDidDismiss().then(() => {
        if (this.activeToast === toast) {
          this.activeToast = null;
        }
      });
    } catch (ionicErr) {
      console.warn('Ionic ToastController error:', ionicErr);
    }
  }

  success(messageKey: string, duration = 3000): Promise<void> {
    return this.show(messageKey, duration, 'success');
  }

  warning(messageKey: string, duration = 3000): Promise<void> {
    return this.show(messageKey, duration, 'warning');
  }

  error(messageKey: string, duration = 3500): Promise<void> {
    return this.show(messageKey, duration, 'danger');
  }
}
