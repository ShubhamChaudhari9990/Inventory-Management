import { Component, inject, signal } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { AppToastService } from '../../../shared/services/app-toast.service';
import {
  AppLanguage,
  LanguageService,
} from '../../../services/language.service';
import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  SETTINGS_ROLES,
  SETTINGS_VIEW_SUBTITLE,
  SettingsRole,
} from '../../data/settings.data';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';

@Component({
  selector: 'app-settings-view',
  templateUrl: './settings-view.component.html',
  styleUrls: ['./settings-view.component.scss'],
  imports: [DashboardSectionCardComponent, IonButton, IonIcon, TranslatePipe],
})
export class SettingsViewComponent {
  private readonly appToast = inject(AppToastService);
  private readonly languageService = inject(LanguageService);

  readonly subtitle = SETTINGS_VIEW_SUBTITLE;
  readonly roles = SETTINGS_ROLES;
  readonly statusLabelKey = statusLabelKey;

  readonly lodgeName = signal('Lemonwood Lodge');
  readonly phone = signal('0231 245 6789');
  readonly gstin = signal('27ABCDE1234F1Z5');
  readonly gstPercent = signal('12');
  readonly serviceCharge = signal('5');
  readonly taxInclusive = signal(true);
  readonly compactLayout = signal(false);
  /** Shared with header via LanguageService — stays in sync both ways. */
  readonly currentLanguage = this.languageService.currentLanguage;

  async setLanguage(lang: AppLanguage): Promise<void> {
    await this.languageService.setLanguage(lang);
  }

  toggleTaxInclusive(): void {
    this.taxInclusive.update((value) => !value);
  }

  toggleCompactLayout(): void {
    this.compactLayout.update((value) => !value);
  }

  saveLodgeDetails(): void {
    void this.appToast.show('SETTINGS.TOAST.SAVED', 2400);
  }

  backupNow(): void {
    void this.appToast.show('SETTINGS.TOAST.BACKUP_CREATED', 2400);
  }

  restoreBackup(): void {
    void this.appToast.show('SETTINGS.TOAST.RESTORE', 2400);
  }

  onLodgeNameInput(event: Event): void {
    this.lodgeName.set((event.target as HTMLInputElement).value);
  }

  onPhoneInput(event: Event): void {
    this.phone.set((event.target as HTMLInputElement).value);
  }

  onGstinInput(event: Event): void {
    this.gstin.set((event.target as HTMLInputElement).value);
  }

  onGstPercentInput(event: Event): void {
    this.gstPercent.set((event.target as HTMLInputElement).value);
  }

  onServiceChargeInput(event: Event): void {
    this.serviceCharge.set((event.target as HTMLInputElement).value);
  }

  trackRole(_: number, role: SettingsRole): string {
    return role.id;
  }
}
