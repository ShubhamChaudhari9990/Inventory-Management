import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth';
import { TranslateService } from '@ngx-translate/core';

import { AppToastService } from '../shared/services/app-toast.service';
import { FirebaseService } from './firebase.service';

export const BIOMETRIC_APP_LOCK_KEY = 'lemonwood_biometric_app_lock';

@Injectable({
  providedIn: 'root',
})
export class AppLockService {
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly translate = inject(TranslateService);
  private readonly appToast = inject(AppToastService);
  private readonly firebaseService = inject(FirebaseService);

  readonly isBiometricSupported = signal<boolean>(false);
  readonly isBiometricEnabled = signal<boolean>(false);
  readonly isAppLocked = signal<boolean>(false);
  readonly isAuthenticating = signal<boolean>(false);

  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Check device biometrics support
    try {
      const info = await BiometricAuth.checkBiometry();
      this.isBiometricSupported.set(!!info.isAvailable);
    } catch {
      this.isBiometricSupported.set(false);
    }

    // Load persisted user preference
    const { value } = await Preferences.get({ key: BIOMETRIC_APP_LOCK_KEY });
    const enabled = value === 'true';
    this.isBiometricEnabled.set(enabled);

    // Wait for Firebase to restore session
    await this.firebaseService.authStateReady();

    // If enabled and user is logged in, lock on app startup
    if (enabled && this.isUserLoggedIn()) {
      this.isAppLocked.set(true);
      // Automatically prompt for unlock
      void this.promptUnlock();
    }

    // Listen to Capacitor app lifecycle (background -> foreground)
    try {
      await App.addListener('appStateChange', (state) => {
        this.ngZone.run(() => {
          if (!state.isActive) {
            // App went to background
            if (this.isBiometricEnabled() && this.isUserLoggedIn()) {
              this.isAppLocked.set(true);
            }
          } else {
            // App came back to foreground
            if (this.isAppLocked()) {
              void this.promptUnlock();
            }
          }
        });
      });
    } catch (e) {
      console.warn('App state listener unavailable:', e);
    }

    // Also listen to document visibility for web/webview switching
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.ngZone.run(() => {
          if (document.hidden) {
            if (this.isBiometricEnabled() && this.isUserLoggedIn()) {
              this.isAppLocked.set(true);
            }
          } else if (this.isAppLocked()) {
            void this.promptUnlock();
          }
        });
      });
    }
  }

  isUserLoggedIn(): boolean {
    return !!this.firebaseService.currentUser;
  }

  async promptUnlock(): Promise<void> {
    if (!this.isAppLocked() || this.isAuthenticating()) return;

    this.isAuthenticating.set(true);
    try {
      await BiometricAuth.authenticate({
        reason: this.translate.instant('APP_LOCK.SUBTITLE') || 'Authenticate to unlock LemonWood',
        allowDeviceCredential: true,
      });

      this.ngZone.run(() => {
        this.isAppLocked.set(false);
        this.isAuthenticating.set(false);
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.isAuthenticating.set(false);
        if (
          error instanceof BiometryError &&
          error.code === BiometryErrorType.userCancel
        ) {
          // Keep locked, user can tap unlock button when ready
          return;
        }
      });
    }
  }

  async setBiometricLock(enable: boolean): Promise<boolean> {
    if (enable) {
      // Must verify biometrics first before turning on
      try {
        const info = await BiometricAuth.checkBiometry();
        if (!info.isAvailable) {
          await this.appToast.show('SETTINGS.SECURITY.UNAVAILABLE', 3000, 'warning');
          return false;
        }

        await BiometricAuth.authenticate({
          reason: this.translate.instant('SETTINGS.SECURITY.ENABLE_CONFIRM') || 'Confirm biometrics to enable app lock',
          allowDeviceCredential: true,
        });

        await Preferences.set({ key: BIOMETRIC_APP_LOCK_KEY, value: 'true' });
        this.isBiometricEnabled.set(true);
        await this.appToast.show('SETTINGS.SECURITY.ENABLED_SUCCESS', 2500, 'success');
        return true;
      } catch (err) {
        if (
          err instanceof BiometryError &&
          err.code === BiometryErrorType.userCancel
        ) {
          return false;
        }
        await this.appToast.show('AUTH.BIOMETRIC_FAILED', 2500, 'warning');
        return false;
      }
    } else {
      // Disable biometric lock
      await Preferences.set({ key: BIOMETRIC_APP_LOCK_KEY, value: 'false' });
      this.isBiometricEnabled.set(false);
      this.isAppLocked.set(false);
      await this.appToast.show('SETTINGS.SECURITY.DISABLED_SUCCESS', 2500, 'success');
      return true;
    }
  }

  resetLock(): void {
    this.isAppLocked.set(false);
    this.isAuthenticating.set(false);
  }

  async logoutFromLockScreen(): Promise<void> {
    this.isAppLocked.set(false);
    this.isAuthenticating.set(false);
    await this.firebaseService.logout();
    await this.router.navigateByUrl('/login');
  }
}
