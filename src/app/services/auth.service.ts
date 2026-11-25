import { Injectable, inject, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { AppToastService } from '../shared/services/app-toast.service';
import { FirebaseService } from './firebase.service';
import { RoleService } from './role.service';
import { AppLockService } from './app-lock.service';
import { UserProfile } from '../interface';

export const BIOMETRIC_ENABLED_KEY = 'lemonwood_biometric_enabled';
export const BIOMETRIC_PROMPTED_KEY = 'lemonwood_biometric_prompted';

export interface RegisterPayload {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  reason?: 'EMAIL_NOT_VERIFIED' | 'AUTH_ERROR' | 'USER_CANCELLED';
  message?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly appToast = inject(AppToastService);
  private readonly translate = inject(TranslateService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly roleService = inject(RoleService);
  private readonly appLockService = inject(AppLockService);
  private readonly ngZone = inject(NgZone);

  readonly pendingVerificationEmail = signal<string | null>(null);

  // ==========================================
  // GOOGLE AUTHENTICATION
  // ==========================================
  async loginWithGoogle(): Promise<AuthResult> {
    try {
      const res = await this.firebaseService.loginWithGoogle();
      const user = res.credential.user;
      if (!user) {
        return { success: false, reason: 'AUTH_ERROR' };
      }

      const googleName =
        res.googleUser?.displayName ||
        res.googleUser?.name ||
        user.displayName ||
        (user.email ? user.email.split('@')[0].replace(/[._-]/g, ' ') : '');
      const googlePhone = user.phoneNumber || '';

      await this.roleService.loadUserProfile(user.uid, user.email ?? '', {
        name: googleName,
        phone: googlePhone,
      });

      await this.ngZone.run(async () => {
        await this.showToast('AUTH.LOGIN_SUCCESS', 'success');
        await this.navigateToDashboard();
      });

      return { success: true, email: user.email ?? '' };
    } catch (err: any) {
      if (err?.message === 'REDIRECTING') {
        return { success: true };
      }
      const errStr = String(err?.message || err?.code || err || '').toLowerCase();
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        errStr.includes('closed') ||
        errStr.includes('cancel') ||
        errStr.includes('12501')
      ) {
        return { success: false, reason: 'USER_CANCELLED' };
      }
      console.error('Google Sign-in failed:', err);
      let toastKey = 'AUTH.GOOGLE_FAILED';
      if (errStr.includes('10')) {
        toastKey = 'AUTH.GOOGLE_CODE_10';
      } else if (errStr.includes('12500')) {
        toastKey = 'AUTH.GOOGLE_CODE_12500';
      } else if (err?.message && err.message.length < 80) {
        toastKey = err.message;
      }
      await this.showToast(toastKey, 'danger');
      return { success: false, reason: 'AUTH_ERROR', message: err?.message };
    }
  }

  // ==========================================
  // EMAIL / PASSWORD LOGIN WITH VERIFICATION
  // ==========================================
  async loginWithPassword(email?: string, password?: string): Promise<AuthResult> {
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();

    if (!trimmedEmail || !trimmedPassword) {
      await this.showToast('REGISTER.ERRORS.REQUIRED', 'warning');
      return {
        success: false,
        reason: 'AUTH_ERROR',
        message: 'Email and password are required',
      };
    }

    try {
      await this.firebaseService.login(trimmedEmail, trimmedPassword);
      const user = await this.firebaseService.reloadUser();

      if (!user?.emailVerified) {
        this.pendingVerificationEmail.set(trimmedEmail);
        await this.showToast('AUTH.EMAIL_NOT_VERIFIED', 'warning');
        return {
          success: false,
          reason: 'EMAIL_NOT_VERIFIED',
          email: trimmedEmail,
        };
      }

      this.pendingVerificationEmail.set(null);
      await this.roleService.loadUserProfile(user.uid, user.email ?? '');

      await this.ngZone.run(async () => {
        await this.showToast('AUTH.LOGIN_SUCCESS', 'success');
        await this.navigateToDashboard();
      });

      return { success: true, email: user.email ?? '' };
    } catch (error: any) {
      console.error('Login error:', error);
      const errorKey =
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/invalid-login-credentials'
          ? 'AUTH.INVALID_CREDENTIALS'
          : error?.code === 'auth/user-not-found'
            ? 'AUTH.USER_NOT_FOUND'
            : 'AUTH.LOGIN_FAILED';
      await this.showToast(errorKey, 'danger');
      return { success: false, reason: 'AUTH_ERROR', message: error?.message };
    }
  }

  // ==========================================
  // REGISTRATION WITH EMAIL VERIFICATION & PENDING STATUS
  // ==========================================
  async registerWithEmailPassword(payload: RegisterPayload): Promise<AuthResult> {
    try {
      const cred = await this.firebaseService.register(
        payload.email,
        payload.password,
      );
      const user = cred.user;

      // Send Firebase verification email
      await this.firebaseService.sendVerificationEmail(user);
      this.pendingVerificationEmail.set(payload.email);

      // Save initial user profile in Firestore (strictly pending approval, no role, no lodge access)
      const userProfile: UserProfile = {
        uid: user.uid,
        name: payload.fullName.trim(),
        email: payload.email.trim(),
        phone: payload.mobile.trim(),
        role: null,
        organizationId: 'org_lemonwood',
        propertyIds: [],
        designation: null,
        permissions: [],
        accountStatus: 'pending',
        status: 'pending',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.roleService.createUserProfile(userProfile);

      return {
        success: true,
        email: payload.email,
      };
    } catch (error: any) {
      console.error('Registration failed:', error);
      const errorKey =
        error?.code === 'auth/email-already-in-use'
          ? 'REGISTER.ERRORS.EMAIL_IN_USE'
          : 'REGISTER.ERRORS.GENERIC';
      await this.showToast(errorKey, 'danger');
      return { success: false, reason: 'AUTH_ERROR', message: error?.message };
    }
  }

  async resendVerificationEmail(): Promise<void> {
    try {
      await this.firebaseService.sendVerificationEmail();
      await this.showToast('AUTH.VERIFICATION_EMAIL_SENT', 'success');
    } catch (err: any) {
      console.error('Failed to resend verification email:', err);
      await this.showToast('AUTH.RESEND_FAILED', 'warning');
    }
  }

  // ==========================================
  // BIOMETRIC AUTHENTICATION
  // ==========================================
  async checkBiometricAvailability(): Promise<boolean> {
    try {
      const biometry = await BiometricAuth.checkBiometry();
      return !!biometry.isAvailable;
    } catch {
      return false;
    }
  }

  async isBiometricEnabled(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
      return value === 'true';
    } catch {
      return false;
    }
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await Preferences.set({
      key: BIOMETRIC_ENABLED_KEY,
      value: enabled ? 'true' : 'false',
    });
  }

  async isBiometricPrompted(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: BIOMETRIC_PROMPTED_KEY });
      return value === 'true';
    } catch {
      return false;
    }
  }

  async setBiometricPrompted(prompted: boolean = true): Promise<void> {
    await Preferences.set({
      key: BIOMETRIC_PROMPTED_KEY,
      value: prompted ? 'true' : 'false',
    });
  }

  async loginWithBiometric(): Promise<void> {
    try {
      const biometry = await BiometricAuth.checkBiometry();
      if (!biometry.isAvailable) {
        await this.ngZone.run(() => this.showToast('AUTH.BIOMETRIC_UNAVAILABLE'));
        return;
      }

      await BiometricAuth.authenticate({
        reason: this.translate.instant('AUTH.BIOMETRIC_REASON'),
        allowDeviceCredential: true,
      });

      await this.ngZone.run(async () => {
        void this.showToast('AUTH.BIOMETRIC_SUCCESS', 'success');
        await this.navigateToDashboard();
      });
    } catch (error) {
      if (
        error instanceof BiometryError &&
        error.code === BiometryErrorType.userCancel
      ) {
        return;
      }

      await this.ngZone.run(() => this.showToast('AUTH.BIOMETRIC_FAILED'));
    }
  }

  // ==========================================
  // PASSWORD RESET
  // ==========================================
  async sendPasswordReset(email?: string): Promise<AuthResult> {
    const trimmed = email?.trim();
    if (!trimmed) {
      await this.showToast('FORGOT.ERRORS.EMAIL_REQUIRED', 'warning');
      return { success: false, reason: 'AUTH_ERROR', message: 'Email is required' };
    }

    try {
      await this.firebaseService.sendPasswordResetEmail(trimmed);
      return { success: true, email: trimmed };
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorKey = 'FORGOT.ERRORS.GENERIC';
      if (
        error?.code === 'auth/user-not-found' ||
        error?.code === 'auth/user-disabled'
      ) {
        errorKey = 'FORGOT.ERRORS.USER_NOT_FOUND';
      } else if (error?.code === 'auth/invalid-email') {
        errorKey = 'FORGOT.ERRORS.INVALID_EMAIL';
      } else if (error?.code === 'auth/too-many-requests') {
        errorKey = 'FORGOT.ERRORS.TOO_MANY_REQUESTS';
      }
      await this.showToast(errorKey, 'danger');
      return { success: false, reason: 'AUTH_ERROR', message: error?.message };
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================
  async logout(): Promise<void> {
    this.roleService.clearProfile();
    this.appLockService.resetLock();
    try {
      await this.firebaseService.logout();
    } catch (err) {
      console.warn('Firebase logout warning:', err);
    }
    await this.ngZone.run(async () => {
      await this.router.navigate(['/login'], { replaceUrl: true });
      await this.showToast('AUTH.LOGOUT_SUCCESS', 'success');
    });
  }

  private async navigateToDashboard(): Promise<void> {
    await this.ngZone.run(async () => {
      const profile = this.roleService.currentUserProfile();
      const status = profile?.accountStatus || (profile?.status as any) || 'pending';
      const role = this.roleService.currentRole();

      if (status !== 'active' || !role) {
        await this.router.navigateByUrl('/pending-approval', { replaceUrl: true });
        return;
      }

      const targetRoute =
        role === 'manager'
          ? '/manager/dashboard'
          : role === 'staff'
            ? '/staff/dashboard'
            : '/owner/dashboard';
      await this.router.navigateByUrl(targetRoute, { replaceUrl: true });
    });
  }

  private async showToast(
    key: string,
    color: 'success' | 'warning' | 'danger' = 'warning',
  ): Promise<void> {
    await this.appToast.show(key, 2500, color);
  }
}
