import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AccountStatus,
  PermissionGroup,
  PermissionKey,
  StaffDesignation,
  StaffMember,
} from '../../../interface';
import { LodgeDataService } from '../../../services/lodge-data.service';
import { PermissionService } from '../../../services/permission.service';
import { PropertyService } from '../../../services/property.service';
import { RoleService } from '../../../services/role.service';
import { statusLabelKey } from '../../../shared/i18n/label-keys';
import { AppToastService } from '../../../shared/services/app-toast.service';
import { STAFF_KPIS, STAFF_VIEW_SUBTITLE } from '../../data/staff.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';
import { UserManagementComponent } from '../../../owner/components/user-management/user-management.component';

@Component({
  selector: 'app-staff-view',
  templateUrl: './staff-view.component.html',
  styleUrls: ['./staff-view.component.scss'],
  imports: [
    FormsModule,
    IonButton,
    IonCheckbox,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    TranslatePipe,
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    UserManagementComponent,
  ],
})
export class StaffViewComponent {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly permissionService = inject(PermissionService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly appToast = inject(AppToastService);

  readonly subtitle = STAFF_VIEW_SUBTITLE;
  readonly statusLabelKey = statusLabelKey;
  readonly isOwner = this.roleService.isOwner;
  readonly isManager = this.roleService.isManager;
  readonly accessibleProperties = this.propertyService.accessibleProperties;

  readonly activeStaffTab = signal<'directory' | 'rbac'>('directory');

  readonly pendingApprovalsCount = computed(() => {
    return this.roleService.registeredUsers().filter(
      (u) => (u.accountStatus || u.status) === 'pending' || !u.role,
    ).length;
  });

  get members(): StaffMember[] {
    return this.lodgeData.staff();
  }

  readonly dynamicKpis = computed(() => {
    const list = this.members;
    const presentCount = list.filter((m) => m.status === 'Present').length;
    const leaveCount = list.filter((m) => m.status === 'On Leave').length;
    const totalCount = list.length;

    return STAFF_KPIS.map((kpi) => {
      if (kpi.id === 'present') return { ...kpi, value: `${presentCount}/${totalCount}` };
      if (kpi.id === 'leave') return { ...kpi, value: String(leaveCount) };
      return kpi;
    });
  });

  get kpis() {
    return this.dynamicKpis();
  }

  // Staff Modal State
  readonly isModalOpen = signal(false);
  readonly editingStaffId = signal<string | null>(null);

  formName = '';
  formEmail = '';
  formPhone = '';
  formSalary = '₹18,000';
  formDesignation: StaffDesignation | string = 'housekeeping';
  formPropertyId = 'lodge_001';
  formStatus: AccountStatus = 'active';
  selectedPermissions: PermissionKey[] = [];

  readonly permissionGroups: PermissionGroup[] = this.permissionService
    .getPermissionGroups()
    .filter((g) => ['rooms', 'reservations', 'housekeeping', 'maintenance', 'finance'].includes(g.category));

  readonly designations: { value: StaffDesignation; labelKey: string }[] = [
    { value: 'receptionist', labelKey: 'STAFF.DESIGNATION.RECEPTIONIST' },
    { value: 'housekeeping', labelKey: 'STAFF.DESIGNATION.HOUSEKEEPING' },
    { value: 'maintenance', labelKey: 'STAFF.DESIGNATION.MAINTENANCE' },
    { value: 'guest_services', labelKey: 'STAFF.DESIGNATION.GUEST_SERVICES' },
    { value: 'security', labelKey: 'STAFF.DESIGNATION.SECURITY' },
    { value: 'kitchen', labelKey: 'STAFF.DESIGNATION.KITCHEN' },
    { value: 'other', labelKey: 'STAFF.DESIGNATION.OTHER' },
  ];

  openAddStaff(): void {
    this.editingStaffId.set(null);
    this.formName = '';
    this.formEmail = '';
    this.formPhone = '';
    this.formSalary = '₹18,000';
    this.formDesignation = 'housekeeping';
    this.formPropertyId = this.propertyService.selectedPropertyId() === 'all'
      ? 'lodge_001'
      : this.propertyService.selectedPropertyId();
    this.formStatus = 'active';
    this.selectedPermissions = this.permissionService.getDefaultPermissions('staff', 'housekeeping');
    this.isModalOpen.set(true);
  }

  openEditStaff(member: StaffMember): void {
    this.editingStaffId.set(member.id);
    this.formName = member.name;
    this.formEmail = member.email || '';
    this.formPhone = member.phone;
    this.formSalary = member.salary;
    this.formDesignation = member.designation || 'housekeeping';
    this.formPropertyId = member.propertyId || 'lodge_001';
    this.formStatus = member.accountStatus || 'active';
    this.selectedPermissions = member.permissions && member.permissions.length > 0
      ? [...member.permissions]
      : this.permissionService.getDefaultPermissions('staff', member.designation);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onDesignationChange(): void {
    this.selectedPermissions = this.permissionService.getDefaultPermissions(
      'staff',
      this.formDesignation,
    );
  }

  isPermissionChecked(key: PermissionKey): boolean {
    return this.selectedPermissions.includes(key);
  }

  togglePermission(key: PermissionKey): void {
    if (this.selectedPermissions.includes(key)) {
      this.selectedPermissions = this.selectedPermissions.filter((p) => p !== key);
    } else {
      this.selectedPermissions = [...this.selectedPermissions, key];
    }
  }

  async saveStaff(): Promise<void> {
    if (!this.formName.trim() || !this.formPhone.trim()) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 2500, 'warning');
      return;
    }

    const initials = this.formName
      .trim()
      .split(' ')
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const staffData: Partial<StaffMember> = {
      name: this.formName.trim(),
      email: this.formEmail.trim(),
      phone: this.formPhone.trim(),
      salary: this.formSalary.trim(),
      designation: this.formDesignation,
      propertyId: this.formPropertyId,
      accountStatus: this.formStatus,
      permissions: this.selectedPermissions,
      initials,
      roleKey: `STAFF.DESIGNATION.${this.formDesignation.toUpperCase()}`,
      status: 'Present',
    };

    try {
      const editId = this.editingStaffId();
      if (editId) {
        await this.lodgeData.updateStaffMember(editId, staffData);
        await this.appToast.show('STAFF.UPDATED_SUCCESS', 2500, 'success');
      } else {
        await this.lodgeData.addStaffMember(staffData as Omit<StaffMember, 'id'>);
        await this.appToast.show('STAFF.CREATED_SUCCESS', 2500, 'success');
      }
      this.closeModal();
    } catch {
      await this.appToast.show('STAFF.ERROR', 3000, 'danger');
    }
  }

  trackMember(_: number, member: StaffMember): string {
    return member.id;
  }
}
