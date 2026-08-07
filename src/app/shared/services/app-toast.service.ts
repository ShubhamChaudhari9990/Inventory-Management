import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

const DESKTOP_MQ = '(min-width: 1027px)';

@Injectable({ providedIn: 'root' })
export class AppToastService {
  private activeToast: HTMLIonToastElement | null = null;

  constructor(
    private readonly toastController: ToastController,
    private readonly translate: TranslateService,
  ) {}

  async show(
    messageKey: string,
    duration = 2500,
    color: 'success' | 'warning' | 'danger' = 'success',
  ): Promise<void> {
    await this.activeToast?.dismiss();

    const isDesktop =
      typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;

    const toast = await this.toastController.create({
      message: this.translate.instant(messageKey),
      duration,
      color,
      /* Web: top; mobile/app: bottom (existing behavior) */
      position: isDesktop ? 'top' : 'bottom',
      cssClass: isDesktop ? 'app-toast app-toast--web' : 'app-toast app-toast--mobile',
    });

    this.activeToast = toast;
    await toast.present();

    void toast.onDidDismiss().then(() => {
      if (this.activeToast === toast) {
        this.activeToast = null;
      }
    });
  }
}
