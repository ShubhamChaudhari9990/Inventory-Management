import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  businessOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  closeOutline,
  createOutline,
  filterOutline,
  keyOutline,
  mailOutline,
  optionsOutline,
  personAddOutline,
  personOutline,
  refreshOutline,
  searchOutline,
  shieldCheckmarkOutline,
  swapHorizontalOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';

import {
  AccountStatus,
  PermissionGroup,
  PermissionKey,
  StaffDesignation,
  UserProfile,
  UserRole,
} from '../../../interface';
import { RoleService } from '../../../services/role.service';
import { PropertyService } from '../../../services/property.service';
import { PermissionService } from '../../../services/permission.service';
import { AppToastService } from '../../../shared/services/app-toast.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    IonIcon,
    IonSpinner,
  ],
})
export class UserManagementComponent {
  private readonly roleService = inject(RoleService);
  private readonly propertyService = inject(PropertyService);
  private readonly permissionService = inject(PermissionService);
  private readonly appToast = inject(AppToastService);

  readonly registeredUsers = this.roleService.registeredUsers;
  readonly properties = this.propertyService.properties;

  // Search & Filter signals
  readonly searchQuery = signal<string>('');
  readonly selectedStatusFilter = signal<string>('all'); // 'all' | 'pending' | 'active' | 'suspended'
  readonly selectedRoleFilter = signal<string>('all'); // 'all' | 'manager' | 'staff' | 'pending'
  readonly selectedPropertyFilter = signal<string>('all');

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isTransferModalOpen = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly selectedUser = signal<UserProfile | null>(null);

  // Form State for Role Assignment / Approval
  formRole: UserRole = 'manager';
  formDesignation: StaffDesignation | string = 'receptionist';
  formSelectedPropertyIds: string[] = [];
  selectedPermissions: PermissionKey[] = [];

  // Transfer Modal State
  transferTargetPropertyIds: string[] = [];

  readonly staffDesignations: { value: StaffDesignation; label: string }[] = [
    { value: 'receptionist', label: 'Receptionist / Front Desk' },
    { value: 'housekeeping', label: 'Housekeeping' },
    { value: 'maintenance', label: 'Maintenance & Facility' },
    { value: 'guest_services', label: 'Guest Services' },
    { value: 'security', label: 'Security' },
    { value: 'kitchen', label: 'Kitchen / F&B' },
    { value: 'other', label: 'General Staff' },
  ];

  readonly permissionGroups: PermissionGroup[] = this.permissionService
    .getPermissionGroups()
    .filter((g) =>
      ['rooms', 'reservations', 'housekeeping', 'maintenance', 'finance', 'staff'].includes(
        g.category,
      ),
    );

  // Stats Counters
  readonly totalUsersCount = computed(() => this.registeredUsers().length);
  readonly pendingCount = computed(
    () =>
      this.registeredUsers().filter(
        (u) => (u.accountStatus || u.status) === 'pending' || !u.role,
      ).length,
  );
  readonly activeCount = computed(
    () =>
      this.registeredUsers().filter(
        (u) => (u.accountStatus || u.status) === 'active' && !!u.role,
      ).length,
  );
  readonly suspendedCount = computed(
    () =>
      this.registeredUsers().filter(
        (u) => (u.accountStatus || u.status) === 'suspended',
      ).length,
  );

  // Filtered Users List
  readonly filteredUsers = computed(() => {
    let list = this.registeredUsers();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatusFilter();
    const role = this.selectedRoleFilter();
    const propId = this.selectedPropertyFilter();

    // Text search (name, email, phone)
    if (query) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          (u.phone && u.phone.includes(query)),
      );
    }

    // Status filter
    if (status === 'pending') {
      list = list.filter((u) => (u.accountStatus || u.status) === 'pending' || !u.role);
    } else if (status === 'active') {
      list = list.filter((u) => (u.accountStatus || u.status) === 'active');
    } else if (status === 'suspended') {
      list = list.filter((u) => (u.accountStatus || u.status) === 'suspended');
    }

    // Role filter
    if (role === 'manager') {
      list = list.filter((u) => u.role === 'manager');
    } else if (role === 'staff') {
      list = list.filter((u) => u.role === 'staff');
    } else if (role === 'pending') {
      list = list.filter((u) => !u.role);
    }

    // Property filter
    if (propId !== 'all') {
      list = list.filter((u) => u.propertyIds?.includes(propId));
    }

    return list;
  });

  constructor() {
    addIcons({
      searchOutline,
      filterOutline,
      personAddOutline,
      personOutline,
      timeOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      alertCircleOutline,
      shieldCheckmarkOutline,
      businessOutline,
      keyOutline,
      createOutline,
      swapHorizontalOutline,
      trashOutline,
      closeOutline,
      optionsOutline,
      refreshOutline,
      mailOutline,
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getPropertyNames(propIds?: string[]): string {
    if (!propIds || propIds.length === 0) return 'No Lodge Assigned';
    const props = this.properties();
    const names = propIds
      .map((id) => props.find((p) => p.id === id)?.name || id)
      .filter(Boolean);
    return names.join(', ');
  }

  isPropertyAssigned(propId: string): boolean {
    return this.formSelectedPropertyIds.includes(propId);
  }

  togglePropertySelection(propId: string): void {
    if (this.formSelectedPropertyIds.includes(propId)) {
      this.formSelectedPropertyIds = this.formSelectedPropertyIds.filter(
        (id) => id !== propId,
      );
    } else {
      this.formSelectedPropertyIds = [...this.formSelectedPropertyIds, propId];
    }
  }

  onRoleChange(newRole: UserRole): void {
    this.formRole = newRole;
    if (newRole === 'owner') {
      this.selectedPermissions = this.permissionService.getDefaultPermissions('owner');
      this.formSelectedPropertyIds = this.properties().map((p) => p.id);
      this.formDesignation = 'Property Owner';
    } else if (newRole === 'manager') {
      this.selectedPermissions = this.permissionService.getDefaultPermissions('manager');
      this.formDesignation = 'Operations Manager';
    } else {
      this.selectedPermissions = this.permissionService.getDefaultPermissions(
        'staff',
        this.formDesignation,
      );
    }
  }

  onDesignationChange(): void {
    if (this.formRole === 'staff') {
      this.selectedPermissions = this.permissionService.getDefaultPermissions(
        'staff',
        this.formDesignation,
      );
    }
  }

  isPermissionChecked(key: PermissionKey): boolean {
    return this.selectedPermissions.includes(key);
  }

  togglePermission(key: PermissionKey): void {
    if (this.selectedPermissions.includes(key)) {
      this.selectedPermissions = this.selectedPermissions.filter((k) => k !== key);
    } else {
      this.selectedPermissions = [...this.selectedPermissions, key];
    }
  }

  // Open Modal for Approval or Edit
  openRoleModal(user: UserProfile): void {
    this.selectedUser.set(user);
    this.formRole = user.role || 'manager';
    this.formDesignation =
      user.designation ||
      (this.formRole === 'owner'
        ? 'Property Owner'
        : this.formRole === 'manager'
          ? 'Operations Manager'
          : 'receptionist');

    this.formSelectedPropertyIds =
      this.formRole === 'owner'
        ? this.properties().map((p) => p.id)
        : user.propertyIds && user.propertyIds.length > 0
          ? [...user.propertyIds]
          : this.properties().length > 0
            ? [this.properties()[0].id]
            : ['lodge_001'];

    if (user.permissions && user.permissions.length > 0) {
      this.selectedPermissions = [...user.permissions];
    } else {
      this.selectedPermissions = this.permissionService.getDefaultPermissions(
        this.formRole,
        this.formRole === 'staff' ? this.formDesignation : undefined,
      );
    }

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedUser.set(null);
  }

  async saveRoleAssignment(): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    const propertyIds =
      this.formRole === 'owner'
        ? this.properties().map((p) => p.id)
        : this.formSelectedPropertyIds;

    if (propertyIds.length === 0) {
      await this.appToast.show('Please select at least one lodge.', 2500, 'warning');
      return;
    }

    const designation =
      this.formRole === 'owner'
        ? 'Property Owner'
        : this.formRole === 'staff'
          ? this.formDesignation
          : 'Operations Manager';

    this.isSaving.set(true);
    try {
      await this.roleService.approveUser({
        userId: user.uid,
        role: this.formRole,
        propertyIds,
        designation,
        permissions: this.selectedPermissions,
      });

      // Optimistically update the user in the registeredUsers signal for immediate UI reactivity
      const currentList = this.roleService.registeredUsers();
      this.roleService.registeredUsers.set(
        currentList.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                role: this.formRole,
                propertyIds,
                designation,
                permissions: this.selectedPermissions,
                accountStatus: 'active' as AccountStatus,
                status: 'active' as AccountStatus,
                isActive: true,
              }
            : u,
        ),
      );

      await this.appToast.show(
        `User ${user.name} successfully updated as ${this.formRole.toUpperCase()}.`,
        3000,
        'success',
      );
      this.closeModal();
    } catch (err: any) {
      console.error('Save role assignment error:', err);
      await this.appToast.show(err?.message || 'Failed to save role.', 3000, 'danger');
    } finally {
      this.isSaving.set(false);
    }
  }

  // Transfer User Modal
  openTransferModal(user: UserProfile): void {
    this.selectedUser.set(user);
    this.transferTargetPropertyIds = user.propertyIds ? [...user.propertyIds] : [];
    this.isTransferModalOpen.set(true);
  }

  closeTransferModal(): void {
    this.isTransferModalOpen.set(false);
    this.selectedUser.set(null);
  }

  isTransferPropChecked(propId: string): boolean {
    return this.transferTargetPropertyIds.includes(propId);
  }

  toggleTransferProp(propId: string): void {
    if (this.transferTargetPropertyIds.includes(propId)) {
      this.transferTargetPropertyIds = this.transferTargetPropertyIds.filter(
        (id) => id !== propId,
      );
    } else {
      this.transferTargetPropertyIds = [...this.transferTargetPropertyIds, propId];
    }
  }

  async confirmTransfer(): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    if (this.transferTargetPropertyIds.length === 0) {
      await this.appToast.show('Please select at least one lodge.', 2500, 'warning');
      return;
    }

    this.isSaving.set(true);
    try {
      await this.roleService.transferUser(user.uid, this.transferTargetPropertyIds);
      await this.appToast.show(
        `User ${user.name} transferred successfully.`,
        3000,
        'success',
      );
      this.closeTransferModal();
    } catch (err: any) {
      await this.appToast.show(err?.message || 'Transfer failed.', 3000, 'danger');
    } finally {
      this.isSaving.set(false);
    }
  }

  // Account Status Toggle (Suspend / Activate)
  async toggleAccountStatus(user: UserProfile): Promise<void> {
    const currentStatus = user.accountStatus || user.status || 'pending';
    const newStatus: AccountStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const label = newStatus === 'active' ? 'activated' : 'suspended';

    try {
      await this.roleService.setUserAccountStatus(
        user.uid,
        newStatus,
        newStatus === 'suspended' ? 'Suspended by Owner via RBAC' : undefined,
      );

      const currentList = this.roleService.registeredUsers();
      this.roleService.registeredUsers.set(
        currentList.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                accountStatus: newStatus,
                status: newStatus,
                isActive: newStatus === 'active',
              }
            : u,
        ),
      );
      await this.appToast.show(
        `Account for ${user.name} has been ${label}.`,
        3000,
        newStatus === 'active' ? 'success' : 'warning',
      );
    } catch (err: any) {
      await this.appToast.show(err?.message || 'Failed to update status.', 3000, 'danger');
    }
  }

  // Revoke Role
  async revokeRole(user: UserProfile): Promise<void> {
    try {
      await this.roleService.revokeUserRole(user.uid);

      const currentList = this.roleService.registeredUsers();
      this.roleService.registeredUsers.set(
        currentList.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                role: null,
                propertyIds: [],
                permissions: [],
                accountStatus: 'pending' as AccountStatus,
                status: 'pending' as AccountStatus,
                isActive: true,
              }
            : u,
        ),
      );
      await this.appToast.show(
        `Role revoked for ${user.name}. Account returned to pending review.`,
        3000,
        'warning',
      );
    } catch (err: any) {
      await this.appToast.show(err?.message || 'Revoke failed.', 3000, 'danger');
    }
  }
}
