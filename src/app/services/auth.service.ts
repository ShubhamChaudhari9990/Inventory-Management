import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { AppToastService } from '../shared/services/app-toast.service';

const PASSKEY_CREDENTIAL_KEY = 'passkey_credential_id';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly appToast = inject(AppToastService);
  private readonly translate = inject(TranslateService);

  async loginWithBiometric(): Promise<void> {
    try {
      const biometry = await BiometricAuth.checkBiometry();
      if (!biometry.isAvailable) {
        await this.showToast('AUTH.BIOMETRIC_UNAVAILABLE');
        return;
      }

      await BiometricAuth.authenticate({
        reason: this.translate.instant('AUTH.BIOMETRIC_REASON'),
        allowDeviceCredential: true,
      });

      await this.showToast('AUTH.BIOMETRIC_SUCCESS', 'success');
      await this.navigateToDashboard();
    } catch (error) {
      if (
        error instanceof BiometryError &&
        error.code === BiometryErrorType.userCancel
      ) {
        return;
      }

      await this.showToast('AUTH.BIOMETRIC_FAILED');
    }
  }

  async loginWithPasskey(): Promise<void> {
    if (!window.PublicKeyCredential) {
      await this.showToast('AUTH.PASSKEY_UNAVAILABLE');
      return;
    }

    try {
      const { value: storedCredentialId } = await Preferences.get({
        key: PASSKEY_CREDENTIAL_KEY,
      });

      if (storedCredentialId) {
        await this.authenticateWithPasskey(storedCredentialId);
        return;
      }

      await this.showToast('AUTH.PASSKEY_SETUP');
      await this.registerPasskey();
    } catch {
      await this.showToast('AUTH.PASSKEY_FAILED');
    }
  }

  async loginWithPassword(): Promise<void> {
    await this.showToast('AUTH.LOGIN_SUCCESS', 'success');
    await this.navigateToDashboard();
  }

  private async registerPasskey(): Promise<void> {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Lemonwood Lodge',
          id: this.getRpId(),
        },
        user: {
          id: userId,
          name: 'staff@lemonwoodlodge.com',
          displayName: 'Lemonwood Staff',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Passkey registration was cancelled.');
    }

    await Preferences.set({
      key: PASSKEY_CREDENTIAL_KEY,
      value: this.bufferToBase64(credential.rawId),
    });

    await this.showToast('AUTH.PASSKEY_SUCCESS', 'success');
    await this.navigateToDashboard();
  }

  private async authenticateWithPasskey(credentialId: string): Promise<void> {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: this.base64ToBuffer(credentialId),
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!assertion) {
      throw new Error('Passkey authentication was cancelled.');
    }

    await this.showToast('AUTH.PASSKEY_SUCCESS', 'success');
    await this.navigateToDashboard();
  }

  private getRpId(): string {
    const hostname = window.location.hostname;
    return hostname || 'localhost';
  }

  private async navigateToDashboard(): Promise<void> {
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  private async showToast(
    key: string,
    color: 'success' | 'warning' | 'danger' = 'warning',
  ): Promise<void> {
    await this.appToast.show(key, 2500, color);
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
