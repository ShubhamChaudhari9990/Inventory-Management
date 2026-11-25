import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { FirebaseService } from '../services/firebase.service';
import { RoleService } from '../services/role.service';

async function resolveRoleDashboard(
  roleService: RoleService,
  uid: string,
  email: string,
): Promise<string> {
  try {
    const profile =
      roleService.currentUserProfile() ||
      (await roleService.loadUserProfile(uid, email));
    const status = profile?.accountStatus || (profile?.status as any) || 'pending';
    if (status !== 'active' || !profile?.role) {
      return '/pending-approval';
    }
    if (profile.role === 'manager') return '/manager/dashboard';
    if (profile.role === 'staff') return '/staff/dashboard';
    if (profile.role === 'owner') return '/owner/dashboard';
  } catch {}
  return '/pending-approval';
}

/**
 * Protects private application routes (/home, etc.).
 * Redirects unauthenticated users to /login.
 */
export const authGuard: CanActivateFn = async () => {
  const firebaseService = inject(FirebaseService);
  const router = inject(Router);

  const firebaseUser = await firebaseService.authStateReady();
  if (firebaseUser) {
    const isPasswordProvider = firebaseUser.providerData.some(
      (p) => p.providerId === 'password',
    );
    if (isPasswordProvider && !firebaseUser.emailVerified) {
      void router.navigate(['/login'], {
        queryParams: { unverified: 'true', email: firebaseUser.email },
      });
      return false;
    }
    return true;
  }

  void router.navigate(['/login'], { replaceUrl: true });
  return false;
};

/**
 * Prevents logged-in users from seeing /login, /register, or /language-selection.
 * Redirects them directly to the /home dashboard.
 */
export const guestGuard: CanActivateFn = async () => {
  const firebaseService = inject(FirebaseService);
  const roleService = inject(RoleService);
  const router = inject(Router);

  const firebaseUser = await firebaseService.authStateReady();
  if (firebaseUser) {
    const isPasswordProvider = firebaseUser.providerData.some(
      (p) => p.providerId === 'password',
    );
    if (!isPasswordProvider || firebaseUser.emailVerified) {
      const target = await resolveRoleDashboard(
        roleService,
        firebaseUser.uid,
        firebaseUser.email ?? '',
      );
      void router.navigate([target], { replaceUrl: true });
      return false;
    }
  }

  return true;
};

/**
 * Smart resolver for the root path ('').
 * Once logged in, opens role dashboard directly.
 * If already selected language, opens /login directly.
 * Only fresh installs see /language-selection.
 */
export const initialRouteGuard: CanActivateFn = async () => {
  const firebaseService = inject(FirebaseService);
  const roleService = inject(RoleService);
  const router = inject(Router);

  const firebaseUser = await firebaseService.authStateReady();
  if (firebaseUser) {
    const isPasswordProvider = firebaseUser.providerData.some(
      (p) => p.providerId === 'password',
    );
    if (!isPasswordProvider || firebaseUser.emailVerified) {
      const target = await resolveRoleDashboard(
        roleService,
        firebaseUser.uid,
        firebaseUser.email ?? '',
      );
      void router.navigate([target], { replaceUrl: true });
      return false;
    }
  }

  // Check if user has previously set language
  try {
    const { value } = await Preferences.get({ key: 'lemonwood_language' });
    if (value) {
      void router.navigate(['/login'], { replaceUrl: true });
      return false;
    }
  } catch {}

  void router.navigate(['/language-selection'], { replaceUrl: true });
  return false;
};
