import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkCircleOutline,
  keyOutline,
  peopleOutline,
  shieldCheckmarkOutline,
  timeOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { EmployeeService } from '../../services/employee.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-staff-hub',
  templateUrl: './staff-hub.page.html',
  styleUrls: ['./staff-hub.page.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, AppShellComponent],
})
export class StaffManagementDashboardPage {
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  readonly isOwner = this.roleService.isOwner;
  readonly isManager = this.roleService.isManager;

  readonly employees = this.employeeService.employees;
  readonly pendingUsers = this.employeeService.pendingUsers;
  readonly auditLogs = this.employeeService.auditLogs;
  readonly lodges = this.propertyService.accessibleProperties;

  readonly totalEmployees = computed(() => this.employees().length);
  readonly activeEmployees = computed(
    () => this.employees().filter((e) => e.employmentStatus === 'active').length,
  );
  readonly pendingApprovalsCount = computed(() => this.pendingUsers().length);
  readonly managersCount = computed(
    () => this.employees().filter((e) => e.role === 'manager').length,
  );
  readonly staffMembersCount = computed(
    () => this.employees().filter((e) => e.role === 'staff').length,
  );

  readonly recentRegistrations = computed(() =>
    [...this.employees()]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 5),
  );

  readonly employeesByLodge = computed(() =>
    this.lodges().map((l) => ({
      id: l.id,
      name: l.name,
      count: this.employees().filter((e) => e.assignedLodgeIds.includes(l.id)).length,
    })),
  );

  constructor() {
    addIcons({
      addOutline,
      checkmarkCircleOutline,
      keyOutline,
      peopleOutline,
      shieldCheckmarkOutline,
      timeOutline,
    });
  }

  goTo(path: string): void {
    void this.router.navigate([path]);
  }

  onNavChange(navId: string): void {
    if (navId === 'staff') return;
    if (navId === 'lodges') { void this.router.navigate(['/lodges']); return; }
    if (navId === 'rooms') { void this.router.navigate(['/rooms']); return; }
    if (navId === 'customers') { void this.router.navigate(['/customers']); return; }
    if (navId === 'payments') { void this.router.navigate(['/payments']); return; }
    const role = this.roleService.currentRole();
    const target =
      role === 'owner'
        ? '/owner/dashboard'
        : role === 'manager'
          ? '/manager/dashboard'
          : '/staff/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
