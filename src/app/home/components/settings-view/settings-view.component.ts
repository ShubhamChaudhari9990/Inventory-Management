import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  businessOutline,
  checkmarkCircleOutline,
  keyOutline,
  logOutOutline,
  peopleOutline,
  settingsOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

import { AppToastService } from '../../../shared/services/app-toast.service';
import { AppLockService } from '../../../services/app-lock.service';
import { AuthService } from '../../../services/auth.service';
import { RoleService } from '../../../services/role.service';
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
import { UserManagementComponent } from '../../../owner/components/user-management/user-management.component';

@Component({
  selector: 'app-settings-view',
  templateUrl: './settings-view.component.html',
  styleUrls: ['./settings-view.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DashboardSectionCardComponent,
    IonButton,
    IonIcon,
    TranslatePipe,
    UserManagementComponent,
  ],
})
export class SettingsViewComponent {
  private readonly appToast = inject(AppToastService);
  private readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  readonly appLockService = inject(AppLockService);

  readonly isOwner = this.roleService.isOwner;
  readonly currentUserProfile = this.roleService.currentUserProfile;
  readonly currentRole = this.roleService.currentRole;
  readonly activeTab = signal<'general' | 'access'>('general');

  readonly pendingUsersCount = computed(() => {
    return this.roleService
      .registeredUsers()
      .filter((u) => (u.accountStatus || u.status) === 'pending' || !u.role).length;
  });

  constructor() {
    addIcons({
      logOutOutline,
      peopleOutline,
      settingsOutline,
      shieldCheckmarkOutline,
      keyOutline,
      businessOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
    });
    this.loadPersistedSettings();
  }

  setTab(tab: 'general' | 'access'): void {
    this.activeTab.set(tab);
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }

  readonly subtitle = SETTINGS_VIEW_SUBTITLE;
  readonly roles = SETTINGS_ROLES;
  readonly statusLabelKey = statusLabelKey;

  readonly isBiometricSupported = this.appLockService.isBiometricSupported;
  readonly isBiometricEnabled = this.appLockService.isBiometricEnabled;

  // 1. Business Profile
  readonly lodgeName = signal('LemonWood');
  readonly phone = signal('0231 245 6789');
  readonly email = signal('management@lemonwood.com');
  readonly gstin = signal('27ABCDE1234F1Z5');

  // 2. Lodge Operation Settings
  readonly checkInTime = signal('12:00 PM');
  readonly checkOutTime = signal('11:00 AM');
  readonly autoTurnoverCleaning = signal(true);
  readonly cancellationPolicy = signal('Free cancellation up to 24 hours prior to check-in.');

  // 3. Financial & Tax Configuration
  readonly gstPercent = signal('12');
  readonly serviceCharge = signal('5');
  readonly taxInclusive = signal(true);
  readonly upiId = signal('lemonwood@icici');

  // 4. Notifications
  readonly notifySms = signal(true);
  readonly notifyWhatsapp = signal(true);
  readonly notifyEmailSummary = signal(false);
  readonly notifyLowStock = signal(true);

  // 5. App Preferences
  readonly compactLayout = signal(false);
  readonly currentLanguage = this.languageService.currentLanguage;

  private loadPersistedSettings(): void {
    try {
      const saved = localStorage.getItem('lemonwood_owner_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lodgeName) this.lodgeName.set(parsed.lodgeName);
        if (parsed.phone) this.phone.set(parsed.phone);
        if (parsed.email) this.email.set(parsed.email);
        if (parsed.gstin) this.gstin.set(parsed.gstin);
        if (parsed.checkInTime) this.checkInTime.set(parsed.checkInTime);
        if (parsed.checkOutTime) this.checkOutTime.set(parsed.checkOutTime);
        if (parsed.gstPercent) this.gstPercent.set(parsed.gstPercent);
        if (parsed.serviceCharge) this.serviceCharge.set(parsed.serviceCharge);
        if (parsed.upiId) this.upiId.set(parsed.upiId);
        if (parsed.cancellationPolicy) this.cancellationPolicy.set(parsed.cancellationPolicy);
        if (typeof parsed.autoTurnoverCleaning === 'boolean') this.autoTurnoverCleaning.set(parsed.autoTurnoverCleaning);
        if (typeof parsed.taxInclusive === 'boolean') this.taxInclusive.set(parsed.taxInclusive);
        if (typeof parsed.notifySms === 'boolean') this.notifySms.set(parsed.notifySms);
        if (typeof parsed.notifyWhatsapp === 'boolean') this.notifyWhatsapp.set(parsed.notifyWhatsapp);
        if (typeof parsed.notifyEmailSummary === 'boolean') this.notifyEmailSummary.set(parsed.notifyEmailSummary);
        if (typeof parsed.notifyLowStock === 'boolean') this.notifyLowStock.set(parsed.notifyLowStock);
      }
    } catch {
      // Fallback to defaults
    }
  }

  saveAllSettings(): void {
    const payload = {
      lodgeName: this.lodgeName(),
      phone: this.phone(),
      email: this.email(),
      gstin: this.gstin(),
      checkInTime: this.checkInTime(),
      checkOutTime: this.checkOutTime(),
      autoTurnoverCleaning: this.autoTurnoverCleaning(),
      cancellationPolicy: this.cancellationPolicy(),
      gstPercent: this.gstPercent(),
      serviceCharge: this.serviceCharge(),
      taxInclusive: this.taxInclusive(),
      upiId: this.upiId(),
      notifySms: this.notifySms(),
      notifyWhatsapp: this.notifyWhatsapp(),
      notifyEmailSummary: this.notifyEmailSummary(),
      notifyLowStock: this.notifyLowStock(),
    };

    localStorage.setItem('lemonwood_owner_settings', JSON.stringify(payload));
    void this.appToast.show('All organization settings saved & persisted.', 2500, 'success');
  }

  async toggleBiometricLock(): Promise<void> {
    const next = !this.isBiometricEnabled();
    await this.appLockService.setBiometricLock(next);
  }

  async setLanguage(lang: AppLanguage): Promise<void> {
    await this.languageService.setLanguage(lang);
  }

  toggleTaxInclusive(): void {
    this.taxInclusive.update((v) => !v);
  }

  toggleAutoTurnover(): void {
    this.autoTurnoverCleaning.update((v) => !v);
  }

  toggleNotifySms(): void {
    this.notifySms.update((v) => !v);
  }

  toggleNotifyWhatsapp(): void {
    this.notifyWhatsapp.update((v) => !v);
  }

  toggleNotifyEmail(): void {
    this.notifyEmailSummary.update((v) => !v);
  }

  toggleNotifyLowStock(): void {
    this.notifyLowStock.update((v) => !v);
  }

  toggleCompactLayout(): void {
    this.compactLayout.update((value) => !value);
  }

  backupNow(): void {
    void this.appToast.show('SETTINGS.TOAST.BACKUP_CREATED', 2400, 'success');
  }

  restoreBackup(): void {
    void this.appToast.show('SETTINGS.TOAST.RESTORE', 2400, 'success');
  }

  trackRole(_: number, role: SettingsRole): string {
    return role.id;
  }
}
