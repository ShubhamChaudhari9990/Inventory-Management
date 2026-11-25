import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { UserProfile, UserRole } from '../interface';
import { RoleService } from '../services/role.service';
import { FirebaseService } from '../services/firebase.service';
import { AppToastService } from '../shared/services/app-toast.service';

/**
 * Helper to resolve the authenticated user's profile verified against Firestore backend.
 */
async function resolveVerifiedProfile(
  firebaseService: FirebaseService,
  roleService: RoleService,
): Promise<UserProfile | null> {
  const firebaseUser = await firebaseService.authStateReady();
  if (!firebaseUser) {
    return null;
  }

  // Ensure user profile is loaded from Firestore backend
  let profile = roleService.currentUserProfile();
  if (!profile || profile.uid !== firebaseUser.uid) {
    try {
      profile = await roleService.loadUserProfile(
        firebaseUser.uid,
        firebaseUser.email ?? '',
        {
          name: firebaseUser.displayName,
          phone: firebaseUser.phoneNumber,
        },
      );
    } catch {
      profile = roleService.currentUserProfile();
    }
  }

  return profile;
}

/**
 * Dynamically resolves the user's role and redirects to their dedicated dashboard:
 * - Pending / Suspended / No Role -> /pending-approval
 * - Owner   -> /owner/dashboard
 * - Manager -> /manager/dashboard
 * - Staff   -> /staff/dashboard
 */
export const roleDashboardRedirectGuard: CanActivateFn = async () => {
  const firebaseService = inject(FirebaseService);
  const roleService = inject(RoleService);
  const router = inject(Router);

  const profile = await resolveVerifiedProfile(firebaseService, roleService);
  if (!profile) {
    void router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  const status = profile.accountStatus || (profile.status as any) || 'pending';
  if (status !== 'active' || !profile.role) {
    void router.navigate(['/pending-approval'], { replaceUrl: true });
    return false;
  }

  if (profile.role === 'owner') {
    void router.navigate(['/owner/dashboard'], { replaceUrl: true });
  } else if (profile.role === 'manager') {
    void router.navigate(['/manager/dashboard'], { replaceUrl: true });
  } else {
    void router.navigate(['/staff/dashboard'], { replaceUrl: true });
  }
  return false;
};

/**
 * Dedicated guard for /pending-approval.
 * If user is already active and assigned a role, sends them to their role dashboard.
 * If pending, suspended, rejected, or unassigned, allows viewing the approval page.
 */
export const pendingApprovalGuard: CanActivateFn = async () => {
  const firebaseService = inject(FirebaseService);
  const roleService = inject(RoleService);
  const router = inject(Router);

  const profile = await resolveVerifiedProfile(firebaseService, roleService);
  if (!profile) {
    void router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  const status = profile.accountStatus || (profile.status as any) || 'pending';
  if (status === 'active' && profile.role) {
    const targetRoute =
      profile.role === 'manager'
        ? '/manager/dashboard'
        : profile.role === 'staff'
          ? '/staff/dashboard'
          : '/owner/dashboard';
    void router.navigate([targetRoute], { replaceUrl: true });
    return false;
  }

  return true;
};

/**
 * Protects Owner-only routes (/owner/dashboard, etc.).
 */
export const ownerGuard: CanActivateFn = async () => {
  const firebaseService = inject(FirebaseService);
  const roleService = inject(RoleService);
  const router = inject(Router);
  const toastService = inject(AppToastService);

  const profile = await resolveVerifiedProfile(firebaseService, roleService);
  if (!profile) {
    void router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  const status = profile.accountStatus || (profile.status as any) || 'pending';
  if (status !== 'active' || !profile.role) {
    void router.navigate(['/pending-approval'], { replaceUrl: true });
    return false;
  }

  if (profile.role === 'owner') {
    return true;
  }

  await toastService.show('Unauthorized: Owner access required.', 3000, 'warning');
  void router.navigate([`/${profile.role}/dashboard`], { replaceUrl: true });
  return false;
};

/**
 * Protects Manager-only routes (/manager/dashboard, etc.).
 * Allows managers (and owners for oversight).
 */
export const managerGuard: CanActivateFn = async () => {
  const firebaseService = inject(FirebaseService);
  const roleService = inject(RoleService);
  const router = inject(Router);
  const toastService = inject(AppToastService);

  const profile = await resolveVerifiedProfile(firebaseService, roleService);
  if (!profile) {
    void router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  const status = profile.accountStatus || (profile.status as any) || 'pending';
  if (status !== 'active' || !profile.role) {
    void router.navigate(['/pending-approval'], { replaceUrl: true });
    return false;
  }

  if (profile.role === 'manager' || profile.role === 'owner') {
    return true;
  }

  await toastService.show('Unauthorized: Manager access required.', 3000, 'warning');
  void router.navigate([`/${profile.role}/dashboard`], { replaceUrl: true });
  return false;
};

/**
 * Protects Staff routes (/staff/dashboard, etc.).
 * Allows staff members (and owners/managers for inspection).
 */
export const staffGuard: CanActivateFn = async () => {
  const firebaseService = inject(FirebaseService);
  const roleService = inject(RoleService);
  const router = inject(Router);

  const profile = await resolveVerifiedProfile(firebaseService, roleService);
  if (!profile) {
    void router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  const status = profile.accountStatus || (profile.status as any) || 'pending';
  if (status !== 'active' || !profile.role) {
    void router.navigate(['/pending-approval'], { replaceUrl: true });
    return false;
  }

  if (profile.role === 'staff' || profile.role === 'manager' || profile.role === 'owner') {
    return true;
  }

  void router.navigate([`/${profile.role}/dashboard`], { replaceUrl: true });
  return false;
};

/**
 * Generic parameter-driven role guard using route.data['roles'].
 */
export const roleGuard: CanActivateFn = async (route) => {
  const firebaseService = inject(FirebaseService);
  const roleService = inject(RoleService);
  const router = inject(Router);
  const toastService = inject(AppToastService);

  const allowedRoles = route.data?.['roles'] as UserRole[] | undefined;
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const profile = await resolveVerifiedProfile(firebaseService, roleService);
  if (!profile) {
    void router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  const status = profile.accountStatus || (profile.status as any) || 'pending';
  if (status !== 'active' || !profile.role) {
    void router.navigate(['/pending-approval'], { replaceUrl: true });
    return false;
  }

  if (allowedRoles.includes(profile.role)) {
    return true;
  }

  await toastService.show('Unauthorized: Insufficient role permissions.', 3000, 'warning');
  void router.navigate([`/${profile.role}/dashboard`], { replaceUrl: true });
  return false;
};

export interface CanComponentDeactivate {
  canDeactivate: () => Promise<boolean> | boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component,
) => {
  return component.canDeactivate ? component.canDeactivate() : true;
};
