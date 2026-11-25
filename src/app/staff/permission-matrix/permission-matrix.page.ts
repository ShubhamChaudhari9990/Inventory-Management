import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, saveOutline } from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { PermissionKey, UserRole } from '../../interface';
import { EmployeeService } from '../../services/employee.service';
import { PermissionService } from '../../services/permission.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-permission-matrix',
  templateUrl: './permission-matrix.page.html',
  styleUrls: ['./permission-matrix.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class PermissionMatrixPage {
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly permissionService = inject(PermissionService);
  private readonly toast = inject(AppToastService);

  readonly employees = computed(() =>
    this.employeeService.employees().filter((e) => e.role !== 'owner'),
  );
  readonly permissionGroups = this.permissionService.getPermissionGroups();

  readonly selectedUid = signal('');
  readonly selectedPermissions = signal<PermissionKey[]>([]);
  readonly isSaving = signal(false);

  constructor() {
    addIcons({ arrowBackOutline, saveOutline });
  }

  onSelectEmployee(uid: string): void {
    this.selectedUid.set(uid);
    const emp = this.employeeService.getEmployeeById(uid);
    this.selectedPermissions.set([...(emp?.permissions || [])]);
  }

  applyTemplate(role: UserRole, designation: string): void {
    const perms = this.permissionService.getDefaultPermissions(role, designation);
    this.selectedPermissions.set([...perms]);
  }

  togglePerm(key: PermissionKey): void {
    const cur = this.selectedPermissions();
    this.selectedPermissions.set(
      cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key],
    );
  }

  async savePermissions(): Promise<void> {
    if (!this.selectedUid() || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      await this.employeeService.updateEmployee(this.selectedUid(), {
        permissions: this.selectedPermissions(),
      });
      this.toast.success('Permissions updated and audit logged.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to update permissions.');
    } finally {
      this.isSaving.set(false);
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
