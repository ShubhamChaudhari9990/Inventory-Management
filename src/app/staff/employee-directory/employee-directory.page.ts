import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  createOutline,
  eyeOutline,
  searchOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { EmployeeRecord, EmployeeService } from '../../services/employee.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-employee-directory',
  templateUrl: './employee-directory.page.html',
  styleUrls: ['./employee-directory.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class EmployeeDirectoryPage {
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  readonly isOwner = this.roleService.isOwner;
  readonly lodges = this.propertyService.accessibleProperties;
  readonly employees = this.employeeService.employees;

  readonly searchQuery = signal('');
  readonly lodgeFilter = signal('all');
  readonly roleFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly sortBy = signal<'name' | 'joiningDate'>('name');
  readonly pageSize = signal(15);

  readonly filtered = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const l = this.lodgeFilter();
    const r = this.roleFilter();
    const st = this.statusFilter();
    const sort = this.sortBy();

    const list = this.employees().filter((e) => {
      if (l !== 'all' && !e.assignedLodgeIds.includes(l)) return false;
      if (r !== 'all' && e.role !== r) return false;
      if (st !== 'all' && e.employmentStatus !== st) return false;
      if (q) {
        const match =
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.phone.toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === 'joiningDate') {
        return (b.joiningDate || '').localeCompare(a.joiningDate || '');
      }
      return a.name.localeCompare(b.name);
    });
  });

  readonly visible = computed(() => this.filtered().slice(0, this.pageSize()));
  readonly hasMore = computed(() => this.filtered().length > this.visible().length);

  constructor() {
    addIcons({ addOutline, arrowBackOutline, createOutline, eyeOutline, searchOutline });
  }

  getLodgeNames(ids: string[]): string {
    if (!ids || ids.length === 0) return 'Unassigned';
    return ids
      .map((id) => this.lodges().find((l) => l.id === id)?.name || id)
      .join(', ');
  }

  loadMore(): void {
    this.pageSize.update((n) => n + 15);
  }

  viewProfile(emp: EmployeeRecord): void {
    void this.router.navigate(['/staff/employees', emp.uid]);
  }

  editEmployee(emp: EmployeeRecord): void {
    void this.router.navigate(['/staff/employees', emp.uid, 'edit']);
  }

  goToAdd(): void {
    void this.router.navigate(['/staff/employees/new']);
  }

  goBack(): void {
    void this.router.navigate(['/staff']);
  }

  onNavChange(navId: string): void {
    if (navId === 'staff') {
      this.goBack();
      return;
    }
    const role = this.roleService.currentRole();
    const target = role === 'owner' ? '/owner/dashboard' : '/manager/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
