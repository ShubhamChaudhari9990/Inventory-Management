import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  banOutline,
  callOutline,
  createOutline,
  mailOutline,
  powerOutline,
} from 'ionicons/icons';
import { Unsubscribe } from 'firebase/firestore';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { EmployeeService, StaffAuditLog } from '../../services/employee.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

export type EmployeeProfileTab = 'overview' | 'permissions' | 'lodges' | 'activity';

@Component({
  selector: 'app-employee-profile',
  templateUrl: './employee-profile.page.html',
  styleUrls: ['./employee-profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, AppShellComponent],
})
export class EmployeeProfilePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly uid = signal('');
  readonly activeTab = signal<EmployeeProfileTab>('overview');
  readonly logs = signal<StaffAuditLog[]>([]);
  private unsub: Unsubscribe | null = null;

  readonly isOwner = this.roleService.isOwner;
  readonly lodges = this.propertyService.properties;

  readonly employee = computed(() =>
    this.employeeService.getEmployeeById(this.uid()),
  );

  readonly assignedLodges = computed(() => {
    const ids = new Set(this.employee()?.assignedLodgeIds || []);
    return this.lodges().filter((l) => ids.has(l.id));
  });

  constructor() {
    addIcons({ arrowBackOutline, banOutline, callOutline, createOutline, mailOutline, powerOutline });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('employeeId') || '';
    this.uid.set(id);
    if (id) {
      this.unsub = this.employeeService.watchAuditForEmployee(id, (l) => this.logs.set(l));
    }
  }

  ngOnDestroy(): void {
    this.unsub?.();
  }

  async toggleSuspend(): Promise<void> {
    const emp = this.employee();
    if (!emp || !this.isOwner()) return;
    const next = emp.employmentStatus === 'suspended' ? 'active' : 'suspended';
    await this.employeeService.updateEmployee(emp.uid, { employmentStatus: next });
    this.toast.success(`${emp.name} is now ${next}.`);
  }

  goBack(): void {
    void this.router.navigate(['/staff/employees']);
  }

  goToEdit(): void {
    void this.router.navigate(['/staff/employees', this.uid(), 'edit']);
  }

  onNavChange(navId: string): void {
    if (navId === 'staff') {
      void this.router.navigate(['/staff']);
      return;
    }
    const role = this.roleService.currentRole();
    const target = role === 'owner' ? '/owner/dashboard' : '/manager/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
