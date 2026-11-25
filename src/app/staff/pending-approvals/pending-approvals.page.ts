import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { PermissionKey, UserProfile, UserRole } from '../../interface';
import { EmployeeService } from '../../services/employee.service';
import { PropertyService } from '../../services/property.service';
import { PermissionService } from '../../services/permission.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-pending-approvals',
  templateUrl: './pending-approvals.page.html',
  styleUrls: ['./pending-approvals.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class PendingApprovalsPage {
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly propertyService = inject(PropertyService);
  private readonly permissionService = inject(PermissionService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly pendingUsers = this.employeeService.pendingUsers;
  readonly lodges = this.propertyService.properties;
  readonly permissionGroups = this.permissionService.getPermissionGroups();

  readonly activeUser = signal<UserProfile | null>(null);
  role: UserRole = 'staff';
  designation = 'receptionist';
  selectedLodgeIds = signal<string[]>([]);
  selectedPermissions = signal<PermissionKey[]>([]);
  readonly isSaving = signal(false);

  constructor() {
    addIcons({ arrowBackOutline, checkmarkCircleOutline, closeCircleOutline });
  }

  openApproval(u: UserProfile): void {
    this.activeUser.set(u);
    this.role = 'staff';
    this.designation = 'receptionist';
    const firstLodge = this.lodges()[0]?.id;
    this.selectedLodgeIds.set(firstLodge ? [firstLodge] : []);
    this.applyTemplate();
  }

  applyTemplate(): void {
    const perms = this.permissionService.getDefaultPermissions(
      this.role,
      this.role === 'manager' ? 'manager' : this.designation,
    );
    this.selectedPermissions.set([...perms]);
  }

  toggleLodge(id: string): void {
    const cur = this.selectedLodgeIds();
    this.selectedLodgeIds.set(
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  togglePerm(key: PermissionKey): void {
    const cur = this.selectedPermissions();
    this.selectedPermissions.set(
      cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key],
    );
  }

  async confirmApproval(): Promise<void> {
    const u = this.activeUser();
    if (!u || this.isSaving()) return;
    if (this.selectedLodgeIds().length === 0) {
      this.toast.warning('Select at least one lodge for this user.');
      return;
    }

    this.isSaving.set(true);
    try {
      await this.employeeService.approvePendingUser({
        userId: u.uid,
        role: this.role,
        propertyIds: this.selectedLodgeIds(),
        designation: this.role === 'manager' ? 'Lodge Manager' : this.designation,
        permissions: this.selectedPermissions(),
      });
      this.toast.success(`${u.name || u.email} approved and activated!`);
      this.activeUser.set(null);
    } catch (err: any) {
      this.toast.error(err?.message || 'Approval failed.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async rejectUser(u: UserProfile): Promise<void> {
    try {
      await this.roleService.setUserAccountStatus(u.uid, 'rejected', 'Rejected by Owner');
      this.toast.success(`${u.name || u.email} rejected.`);
    } catch (err: any) {
      this.toast.error(err?.message || 'Rejection failed.');
    }
  }

  goBack(): void {
    void this.router.navigate(['/staff']);
  }

  onNavChange(navId: string): void {
    if (navId === 'staff') {
      this.goBack();
      return;
    }
    void this.router.navigate(['/owner/dashboard'], { queryParams: { nav: navId } });
  }
}
