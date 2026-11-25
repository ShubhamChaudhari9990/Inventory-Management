import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AccountStatus,
  PermissionKey,
  PropertyMembership,
  RoleDefinition,
  UserProfile,
  UserRole,
  UserRoleAssignment,
} from '../interface';
import { FirebaseService } from './firebase.service';

export const SYSTEM_ROLES: readonly RoleDefinition[] = [
  {
    id: 'owner',
    labelKey: 'ROLES.OWNER',
    descriptionKey: 'ROLES.OWNER_DESC',
    badgeTone: 'primary',
  },
  {
    id: 'manager',
    labelKey: 'ROLES.MANAGER',
    descriptionKey: 'ROLES.MANAGER_DESC',
    badgeTone: 'warm',
  },
  {
    id: 'staff',
    labelKey: 'ROLES.STAFF',
    descriptionKey: 'ROLES.STAFF_DESC',
    badgeTone: 'success',
  },
];

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);

  private unsubscribeUserDoc: (() => void) | null = null;
  private unsubscribeUsersCol: (() => void) | null = null;

  readonly currentUserProfile = signal<UserProfile | null>(null);
  readonly registeredUsers = signal<UserProfile[]>([]);

  // Derived Account Status and Roles
  readonly accountStatus = computed<AccountStatus>(() => {
    const profile = this.currentUserProfile();
    return profile?.accountStatus || (profile?.status as AccountStatus) || 'pending';
  });

  readonly isAccountActive = computed(() => {
    const profile = this.currentUserProfile();
    if (profile?.role === 'owner') return true;
    return this.accountStatus() === 'active';
  });
  readonly isPending = computed(() => {
    const profile = this.currentUserProfile();
    if (!profile) return false;
    if (profile.role === 'owner') return false;
    return this.accountStatus() === 'pending' || !profile.role;
  });
  readonly isSuspended = computed(() => this.accountStatus() === 'suspended');
  readonly isRejected = computed(() => this.accountStatus() === 'rejected');

  readonly currentRole = computed<UserRole | null>(() => {
    const profile = this.currentUserProfile();
    if (!profile) return null;
    if (profile.role === 'owner') return 'owner';
    if (this.accountStatus() !== 'active') {
      return null;
    }
    return profile.role ?? null;
  });

  readonly currentOrganizationId = computed(
    () => this.currentUserProfile()?.organizationId ?? 'org_lemonwood',
  );
  readonly assignedPropertyIds = computed(
    () => this.currentUserProfile()?.propertyIds ?? [],
  );
  readonly currentDesignation = computed(
    () => this.currentUserProfile()?.designation ?? '',
  );

  readonly isOwner = computed(() => this.currentRole() === 'owner');
  readonly isManager = computed(() => this.currentRole() === 'manager');
  readonly isStaff = computed(() => this.currentRole() === 'staff');

  constructor() {
    this.initAuthObserver();
  }

  private initAuthObserver(): void {
    this.firebaseService.currentUser$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        await this.loadUserProfile(firebaseUser.uid, firebaseUser.email ?? '', {
          name: firebaseUser.displayName,
          phone: firebaseUser.phoneNumber,
        });
        this.startLiveUserDocListener(firebaseUser.uid);
      } else {
        this.stopListeners();
        this.ngZone.run(() => {
          this.currentUserProfile.set(null);
        });
      }
    });
  }

  private startLiveUserDocListener(uid: string): void {
    if (this.unsubscribeUserDoc) {
      try {
        this.unsubscribeUserDoc();
      } catch {}
      this.unsubscribeUserDoc = null;
    }

    const db = this.firebaseService.dbInstance;
    const userDocRef = doc(db, 'users', uid);

    this.unsubscribeUserDoc = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          const normalizedStatus: AccountStatus =
            data.accountStatus || (data.status as AccountStatus) || 'pending';

          const updatedProfile: UserProfile = {
            ...data,
            uid,
            accountStatus: normalizedStatus,
            status: normalizedStatus,
            isActive: normalizedStatus === 'active',
          };

          this.ngZone.run(() => {
            this.currentUserProfile.set(updatedProfile);
          });

          // Start listening to all users if role permits
          if (updatedProfile.role === 'owner' || updatedProfile.role === 'manager') {
            this.startUsersListListener();
          }
        }
      },
      (err) => {
        console.warn('Current user doc live sync error:', err.message);
      },
    );
  }

  private startUsersListListener(): void {
    if (this.unsubscribeUsersCol) return;

    const db = this.firebaseService.dbInstance;
    const usersColRef = collection(db, 'users');

    this.unsubscribeUsersCol = onSnapshot(
      usersColRef,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as UserProfile;
          const normalizedStatus: AccountStatus =
            data.accountStatus || (data.status as AccountStatus) || 'pending';
          return {
            ...data,
            uid: docSnap.id,
            accountStatus: normalizedStatus,
            status: normalizedStatus,
            isActive: normalizedStatus === 'active',
          };
        });
        this.ngZone.run(() => {
          this.registeredUsers.set(list);
        });
      },
      (err) => {
        console.warn('Users listener notice:', err.message);
      },
    );
  }

  private stopListeners(): void {
    if (this.unsubscribeUserDoc) {
      try {
        this.unsubscribeUserDoc();
      } catch {}
      this.unsubscribeUserDoc = null;
    }
    if (this.unsubscribeUsersCol) {
      try {
        this.unsubscribeUsersCol();
      } catch {}
      this.unsubscribeUsersCol = null;
    }
  }

  clearProfile(): void {
    this.currentUserProfile.set(null);
  }

  /**
   * Loads user profile from Firestore server.
   * New users are registered with 'pending' status and require Owner approval or set-owner CLI promotion.
   * Existing roles in Firestore are strictly preserved.
   */
  async loadUserProfile(
    uid: string,
    email: string,
    initialData?: { name?: string | null; phone?: string | null },
  ): Promise<UserProfile> {
    const db = this.firebaseService.dbInstance;
    const userDocRef = doc(db, 'users', uid);

    const dynamicName =
      initialData?.name?.trim() ||
      (email ? email.split('@')[0].replace(/[._-]/g, ' ') : 'User');

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const normalizedStatus: AccountStatus =
          data.accountStatus || (data.status as AccountStatus) || 'pending';

        const updatedProfile: UserProfile = {
          ...data,
          uid,
          accountStatus: normalizedStatus,
          status: normalizedStatus,
          isActive: normalizedStatus === 'active',
        };

        this.currentUserProfile.set(updatedProfile);
        return updatedProfile;
      }
    } catch (err) {
      console.warn('Could not read user profile from Firestore:', err);
    }

    const newProfile: UserProfile = {
      uid,
      name: dynamicName,
      email,
      phone: initialData?.phone || '',
      accountStatus: 'pending',
      status: 'pending',
      isActive: true,
      role: null,
      propertyIds: [],
      permissions: [],
      organizationId: 'org_lemonwood',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(userDocRef, newProfile, { merge: true });
    } catch (e) {
      console.warn('Initial user profile write notice:', e);
    }

    this.currentUserProfile.set(newProfile);
    return newProfile;
  }

  async createUserProfile(profile: UserProfile): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const userDocRef = doc(db, 'users', profile.uid);
    await setDoc(userDocRef, profile, { merge: true });
    this.currentUserProfile.set(profile);
  }

  hasRole(role: UserRole | UserRole[]): boolean {
    const current = this.currentRole();
    if (!current) return false;
    if (Array.isArray(role)) {
      return role.includes(current);
    }
    return current === role;
  }

  canAccessProperty(propertyId: string): boolean {
    if (!this.isAccountActive()) {
      return false;
    }
    if (!propertyId || propertyId === 'all') {
      return this.isOwner();
    }
    if (this.isOwner()) {
      return true;
    }
    return this.assignedPropertyIds().includes(propertyId);
  }

  getAccessibleProperties(): string[] {
    if (!this.isAccountActive()) return [];
    return this.assignedPropertyIds();
  }

  getCurrentRole(): UserRole | null {
    return this.currentRole();
  }

  // ==========================================
  // OWNER USER MANAGEMENT (RBAC Operations)
  // ==========================================

  /**
   * Owner approves a pending user and assigns role, lodge(s), designation, and permissions.
   */
  async approveUser(assignment: UserRoleAssignment): Promise<void> {
    if (!this.isOwner()) {
      throw new Error('Unauthorized: Only the Property Owner can approve users and assign roles.');
    }

    const db = this.firebaseService.dbInstance;
    const userRef = doc(db, 'users', assignment.userId);
    const now = new Date().toISOString();
    const ownerName = this.currentUserProfile()?.name || 'Owner';

    const updates: Partial<UserProfile> = {
      role: assignment.role,
      propertyIds: assignment.propertyIds,
      designation: assignment.designation || (assignment.role === 'manager' ? 'Operations Manager' : 'Staff'),
      permissions: assignment.permissions || [],
      accountStatus: 'active',
      status: 'active',
      isActive: true,
      assignedBy: ownerName,
      assignedAt: now,
      updatedAt: now,
    };

    await updateDoc(userRef, updates);

    // Write lodge membership records under properties/{propertyId}/members/{userId}
    for (const propId of assignment.propertyIds) {
      const memberRef = doc(db, 'properties', propId, 'members', assignment.userId);
      const membership: PropertyMembership = {
        id: `${propId}_${assignment.userId}`,
        userId: assignment.userId,
        propertyId: propId,
        organizationId: 'org_lemonwood',
        role: assignment.role,
        designation: assignment.designation,
        assignedAt: now,
        assignedBy: ownerName,
        status: 'active',
        permissions: assignment.permissions,
      };
      try {
        await setDoc(memberRef, membership, { merge: true });
      } catch (err) {
        console.warn(`Lodge member doc creation notice (${propId}):`, err);
      }
    }
  }

  /**
   * Owner changes an existing user's role or lodge assignment.
   */
  async updateUserRole(
    userId: string,
    role: UserRole,
    propertyIds: string[],
    designation?: string,
    permissions?: PermissionKey[],
  ): Promise<void> {
    if (!this.isOwner()) {
      throw new Error('Unauthorized: Only the Owner can modify user roles.');
    }

    const db = this.firebaseService.dbInstance;
    const userRef = doc(db, 'users', userId);
    const now = new Date().toISOString();

    const updates: Partial<UserProfile> = {
      role,
      propertyIds,
      designation: designation || (role === 'manager' ? 'Operations Manager' : 'Staff'),
      permissions: permissions || [],
      accountStatus: 'active',
      status: 'active',
      isActive: true,
      updatedAt: now,
    };

    await updateDoc(userRef, updates);
  }

  /**
   * Transfers a user between lodges (updates assigned propertyIds).
   */
  async transferUser(userId: string, newPropertyIds: string[]): Promise<void> {
    if (!this.isOwner()) {
      throw new Error('Unauthorized: Only the Owner can transfer users.');
    }

    const db = this.firebaseService.dbInstance;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      propertyIds: newPropertyIds,
      accountStatus: 'active',
      status: 'active',
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Activates, suspends, or rejects an account.
   */
  async setUserAccountStatus(
    userId: string,
    accountStatus: AccountStatus,
    reason?: string,
  ): Promise<void> {
    if (!this.isOwner()) {
      throw new Error('Unauthorized: Only the Owner can modify account status.');
    }

    const db = this.firebaseService.dbInstance;
    const userRef = doc(db, 'users', userId);

    const updates: Partial<UserProfile> = {
      accountStatus,
      status: accountStatus,
      isActive: accountStatus === 'active',
      rejectionReason: reason || '',
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(userRef, updates);
  }

  /**
   * Revokes user role and resets them to pending status.
   */
  async revokeUserRole(userId: string): Promise<void> {
    if (!this.isOwner()) {
      throw new Error('Unauthorized: Only the Owner can revoke roles.');
    }

    const db = this.firebaseService.dbInstance;
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      role: null,
      propertyIds: [],
      permissions: [],
      accountStatus: 'pending',
      status: 'pending',
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Demo switcher for testing role UI states.
   */
  switchRole(role: UserRole | 'pending' | 'suspended'): void {
    const current = this.currentUserProfile();
    const now = new Date().toISOString();
    if (!current) return;

    if (role === 'owner') {
      this.currentUserProfile.set({
        ...current,
        role: 'owner',
        accountStatus: 'active',
        status: 'active',
        isActive: true,
        updatedAt: now,
      });
    } else if (role === 'manager') {
      this.currentUserProfile.set({
        ...current,
        role: 'manager',
        accountStatus: 'active',
        status: 'active',
        isActive: true,
        updatedAt: now,
      });
    } else if (role === 'staff') {
      this.currentUserProfile.set({
        ...current,
        role: 'staff',
        accountStatus: 'active',
        status: 'active',
        isActive: true,
        updatedAt: now,
      });
    } else if (role === 'suspended') {
      this.currentUserProfile.set({
        ...current,
        accountStatus: 'suspended',
        status: 'suspended',
        isActive: false,
        updatedAt: now,
      });
    } else {
      this.currentUserProfile.set({
        ...current,
        role: null,
        accountStatus: 'pending',
        status: 'pending',
        isActive: true,
        updatedAt: now,
      });
    }
  }
}
