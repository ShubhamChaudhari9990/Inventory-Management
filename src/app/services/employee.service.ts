import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import {
  AccountStatus,
  PermissionKey,
  UserProfile,
  UserRole,
} from '../interface';
import { FirebaseService } from './firebase.service';
import { LodgeDataService } from './lodge-data.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

export interface StaffAuditLog {
  id: string;
  actorUid: string;
  actorName: string;
  targetUid: string;
  targetName?: string;
  organizationId: string;
  lodgeId?: string;
  action:
    | 'Employee Created'
    | 'Employee Updated'
    | 'Role Assigned'
    | 'Role Changed'
    | 'Lodge Assigned'
    | 'Lodge Removed'
    | 'Permissions Updated'
    | 'User Approved'
    | 'User Suspended'
    | 'User Deactivated';
  summary: string;
  timestamp: string;
}

export interface EmployeeRecord {
  uid: string;
  employeeId: string;
  organizationId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  photoUrl?: string;
  photoPath?: string;
  address?: string;
  dateOfBirth?: string;
  role: UserRole | null;
  designation: string;
  department?: string;
  assignedLodgeIds: string[];
  permissions: PermissionKey[];
  employmentType?: 'Full-Time' | 'Part-Time' | 'Contract';
  employmentStatus: AccountStatus;
  joiningDate?: string;
  createdAt?: string;
  updatedAt?: string;
  sourceProfile?: UserProfile;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  private unsubAudit: (() => void) | null = null;
  private readonly rawAuditLogs = signal<StaffAuditLog[]>([]);

  readonly auditLogs = computed(() =>
    [...this.rawAuditLogs()].sort((a, b) =>
      (b.timestamp || '').localeCompare(a.timestamp || ''),
    ),
  );

  readonly employees = computed<EmployeeRecord[]>(() => {
    const users = this.roleService.registeredUsers();
    const selProp = this.propertyService.selectedPropertyId();
    const isOwner = this.roleService.isOwner();
    const allowedProps = this.roleService.assignedPropertyIds();

    return users
      .filter((u) => {
        if (isOwner) {
          if (selProp !== 'all' && !(u.propertyIds || []).includes(selProp) && u.role !== 'owner') {
            return false;
          }
          return true;
        }
        // Manager sees employees in their assigned lodges
        const uProps = u.propertyIds || [];
        const overlaps = uProps.some((pid) => allowedProps.includes(pid));
        if (!overlaps) return false;
        if (selProp !== 'all' && !uProps.includes(selProp)) return false;
        return true;
      })
      .map((u) => this.mapUserToEmployee(u));
  });

  readonly pendingUsers = computed<UserProfile[]>(() =>
    this.roleService
      .registeredUsers()
      .filter(
        (u) =>
          u.role !== 'owner' &&
          ((u.accountStatus || u.status) === 'pending' || !u.role),
      ),
  );

  constructor() {
    this.firebaseService.currentUser$.subscribe((user) => {
      if (user) this.startAuditListener();
      else this.stopAuditListener();
    });
  }

  private startAuditListener(): void {
    if (this.unsubAudit) return;
    const db = this.firebaseService.dbInstance;
    this.unsubAudit = onSnapshot(
      collection(db, 'staffAuditLogs'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as StaffAuditLog), id: d.id }));
        this.ngZone.run(() => this.rawAuditLogs.set(list));
      },
      (err) => console.warn('Staff audit listener error:', err.message),
    );
  }

  private stopAuditListener(): void {
    try { this.unsubAudit?.(); } catch {}
    this.unsubAudit = null;
  }

  mapUserToEmployee(u: UserProfile): EmployeeRecord {
    const parts = (u.name || '').trim().split(/\s+/);
    return {
      uid: u.uid,
      employeeId: (u as any).employeeId || `EMP-${u.uid.slice(0, 6).toUpperCase()}`,
      organizationId: u.organizationId || this.roleService.currentOrganizationId(),
      name: u.name || u.email,
      firstName: (u as any).firstName || parts[0] || '',
      lastName: (u as any).lastName || parts.slice(1).join(' ') || '',
      email: u.email,
      phone: u.phone || '',
      photoUrl: (u as any).photoUrl || '',
      photoPath: (u as any).photoPath || '',
      address: (u as any).address || '',
      dateOfBirth: (u as any).dateOfBirth || '',
      role: u.role ?? null,
      designation: u.designation || (u.role === 'owner' ? 'Owner' : 'Staff'),
      department: (u as any).department || 'Operations',
      assignedLodgeIds: u.propertyIds || [],
      permissions: u.permissions || [],
      employmentType: (u as any).employmentType || 'Full-Time',
      employmentStatus: (u.accountStatus || (u.status as AccountStatus) || 'pending'),
      joiningDate: (u as any).joiningDate || (u.createdAt ? u.createdAt.slice(0, 10) : ''),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      sourceProfile: u,
    };
  }

  getEmployeeById(uid: string): EmployeeRecord | undefined {
    const u = this.roleService.registeredUsers().find((x) => x.uid === uid);
    return u ? this.mapUserToEmployee(u) : undefined;
  }

  findUserByEmail(email: string): UserProfile | undefined {
    const norm = email.trim().toLowerCase();
    return this.roleService
      .registeredUsers()
      .find((u) => u.email.trim().toLowerCase() === norm);
  }

  // ==========================================
  // PRIVILEGED RBAC & EMPLOYEE MUTATIONS
  // ==========================================

  async approvePendingUser(params: {
    userId: string;
    role: UserRole;
    propertyIds: string[];
    designation: string;
    permissions: PermissionKey[];
  }): Promise<void> {
    if (!this.roleService.isOwner()) {
      throw new Error('Only the Owner can approve pending accounts.');
    }
    if (params.userId === this.roleService.currentUserProfile()?.uid) {
      throw new Error('You cannot approve your own account.');
    }
    await this.roleService.approveUser({
      userId: params.userId,
      role: params.role,
      propertyIds: params.propertyIds,
      designation: params.designation,
      permissions: params.permissions,
    });
    const target = this.getEmployeeById(params.userId);
    await this.logAudit({
      targetUid: params.userId,
      targetName: target?.name,
      lodgeId: params.propertyIds[0],
      action: 'User Approved',
      summary: `Approved as ${params.role} (${params.designation}) for ${params.propertyIds.length} lodge(s)`,
    });
  }

  async createOrLinkEmployee(data: {
    existingUid?: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    dateOfBirth?: string;
    photoUrl?: string;
    photoPath?: string;
    role: UserRole;
    designation: string;
    department?: string;
    assignedLodgeIds: string[];
    permissions: PermissionKey[];
    employmentType: 'Full-Time' | 'Part-Time' | 'Contract';
    employmentStatus: AccountStatus;
    joiningDate: string;
  }): Promise<string> {
    if (!this.roleService.isOwner()) {
      throw new Error('Only the Owner can create or link employee accounts.');
    }
    if (data.role === 'owner') {
      throw new Error('Cannot assign Owner role through employee form.');
    }

    const db = this.firebaseService.dbInstance;
    const now = new Date().toISOString();
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    const existingByEmail = this.findUserByEmail(data.email);
    const targetUid = data.existingUid || existingByEmail?.uid || `INV-${Date.now()}`;

    const userPayload: Record<string, any> = {
      uid: targetUid,
      employeeId: data.employeeId.trim(),
      name: fullName,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      address: data.address?.trim() || '',
      dateOfBirth: data.dateOfBirth || '',
      photoUrl: data.photoUrl || '',
      photoPath: data.photoPath || '',
      role: data.role,
      designation: data.designation,
      department: data.department || 'Operations',
      organizationId: this.roleService.currentOrganizationId(),
      propertyIds: data.assignedLodgeIds,
      permissions: data.permissions,
      employmentType: data.employmentType,
      accountStatus: data.employmentStatus,
      status: data.employmentStatus,
      isActive: data.employmentStatus === 'active',
      joiningDate: data.joiningDate,
      updatedAt: now,
    };

    if (existingByEmail || data.existingUid) {
      await updateDoc(doc(db, 'users', targetUid), userPayload);
    } else {
      userPayload['createdAt'] = now;
      await setDoc(doc(db, 'users', targetUid), userPayload);
    }

    // Also keep operational staff directory record synced
    await this.lodgeData.addStaffMember({
      propertyId: data.assignedLodgeIds[0] || '',
      propertyIds: data.assignedLodgeIds,
      organizationId: this.roleService.currentOrganizationId(),
      initials: fullName
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      name: fullName,
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      address: data.address?.trim() || '',
      designation: data.designation,
      roleKey: data.role,
      salary: '₹0',
      status: 'Present',
      accountStatus: data.employmentStatus,
      permissions: data.permissions,
      shift: 'Morning',
    });

    await this.logAudit({
      targetUid,
      targetName: fullName,
      lodgeId: data.assignedLodgeIds[0],
      action: 'Employee Created',
      summary: `Created/linked ${fullName} as ${data.role} (${data.designation})`,
    });
    return targetUid;
  }

  async updateEmployee(
    uid: string,
    updates: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      address: string;
      dateOfBirth: string;
      photoUrl: string;
      photoPath: string;
      role: UserRole;
      designation: string;
      department: string;
      assignedLodgeIds: string[];
      permissions: PermissionKey[];
      employmentType: 'Full-Time' | 'Part-Time' | 'Contract';
      employmentStatus: AccountStatus;
    }>,
  ): Promise<void> {
    if (!this.roleService.isOwner()) {
      throw new Error('Only the Owner can modify employee authorization.');
    }
    const existing = this.getEmployeeById(uid);
    if (!existing) throw new Error('Employee not found.');
    if (updates.role === 'owner' && existing.role !== 'owner') {
      throw new Error('Cannot promote another user to Owner.');
    }

    const now = new Date().toISOString();
    const payload: Record<string, any> = { updatedAt: now };
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const fn = updates.firstName ?? existing.firstName ?? '';
      const ln = updates.lastName ?? existing.lastName ?? '';
      payload['firstName'] = fn;
      payload['lastName'] = ln;
      payload['name'] = [fn, ln].filter(Boolean).join(' ').trim();
    }
    if (updates.phone !== undefined) payload['phone'] = updates.phone;
    if (updates.address !== undefined) payload['address'] = updates.address;
    if (updates.dateOfBirth !== undefined) payload['dateOfBirth'] = updates.dateOfBirth;
    if (updates.photoUrl !== undefined) payload['photoUrl'] = updates.photoUrl;
    if (updates.photoPath !== undefined) payload['photoPath'] = updates.photoPath;
    if (updates.role !== undefined) payload['role'] = updates.role;
    if (updates.designation !== undefined) payload['designation'] = updates.designation;
    if (updates.department !== undefined) payload['department'] = updates.department;
    if (updates.assignedLodgeIds !== undefined) payload['propertyIds'] = updates.assignedLodgeIds;
    if (updates.permissions !== undefined) payload['permissions'] = updates.permissions;
    if (updates.employmentType !== undefined) payload['employmentType'] = updates.employmentType;
    if (updates.employmentStatus !== undefined) {
      payload['accountStatus'] = updates.employmentStatus;
      payload['status'] = updates.employmentStatus;
      payload['isActive'] = updates.employmentStatus === 'active';
    }

    await updateDoc(doc(this.firebaseService.dbInstance, 'users', uid), payload);

    const action: StaffAuditLog['action'] =
      updates.employmentStatus === 'suspended'
        ? 'User Suspended'
        : updates.employmentStatus === 'inactive'
          ? 'User Deactivated'
          : updates.permissions && updates.permissions.length !== existing.permissions.length
            ? 'Permissions Updated'
            : updates.role && updates.role !== existing.role
              ? 'Role Changed'
              : 'Employee Updated';

    await this.logAudit({
      targetUid: uid,
      targetName: existing.name,
      lodgeId: (updates.assignedLodgeIds || existing.assignedLodgeIds)[0],
      action,
      summary: `Updated profile/authorization for ${existing.name}`,
    });
  }

  // ==========================================
  // FIREBASE STORAGE (PROFILE PHOTO)
  // ==========================================

  uploadEmployeePhoto(
    employeeUid: string,
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<{ url: string; storagePath: string }> {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return Promise.reject(new Error('Unsupported format. Use JPG, PNG, or WebP.'));
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return Promise.reject(new Error('Photo exceeds 5 MB limit.'));
    }

    const orgId = this.roleService.currentOrganizationId();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `businesses/${orgId}/employees/${employeeUid}/profile/${Date.now()}_${safeName}`;
    const storageRef = ref(this.firebaseService.storageInstance, storagePath);

    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            this.ngZone.run(() =>
              onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            );
          }
        },
        (e) => reject(e),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve({ url, storagePath });
          } catch (e) {
            reject(e);
          }
        },
      );
    });
  }

  async deleteStorageFile(storagePath?: string | null): Promise<void> {
    if (!storagePath) return;
    try {
      await deleteObject(ref(this.firebaseService.storageInstance, storagePath));
    } catch {}
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================

  async logAudit(params: {
    targetUid: string;
    targetName?: string;
    lodgeId?: string;
    action: StaffAuditLog['action'];
    summary: string;
  }): Promise<void> {
    try {
      const actor = this.roleService.currentUserProfile();
      const id = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const entry: StaffAuditLog = {
        id,
        actorUid: actor?.uid || 'system',
        actorName: actor?.name || actor?.email || 'Owner',
        targetUid: params.targetUid,
        targetName: params.targetName,
        organizationId: this.roleService.currentOrganizationId(),
        lodgeId: params.lodgeId,
        action: params.action,
        summary: params.summary,
        timestamp: new Date().toISOString(),
      };
      await setDoc(doc(this.firebaseService.dbInstance, 'staffAuditLogs', id), entry);
    } catch {}
  }

  watchAuditForEmployee(
    targetUid: string,
    onChange: (logs: StaffAuditLog[]) => void,
  ): Unsubscribe {
    const db = this.firebaseService.dbInstance;
    return onSnapshot(collection(db, 'staffAuditLogs'), (snap) => {
      const items = snap.docs
        .map((d) => ({ ...(d.data() as StaffAuditLog), id: d.id }))
        .filter((l) => l.targetUid === targetUid)
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      this.ngZone.run(() => onChange(items));
    });
  }
}
