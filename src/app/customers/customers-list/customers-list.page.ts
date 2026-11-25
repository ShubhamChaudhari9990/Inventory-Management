import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  callOutline,
  createOutline,
  eyeOutline,
  mailOutline,
  peopleOutline,
  personOutline,
  refreshOutline,
  searchOutline,
  starOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { CustomerAccountStatus, CustomerItem, CustomerType } from '../../interface';
import { CustomerService } from '../../services/customer.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-customers-list',
  templateUrl: './customers-list.page.html',
  styleUrls: ['./customers-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class CustomersListPage {
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly permissionService = inject(PermissionService);

  readonly customers = this.customerService.customers;
  readonly bookings = this.lodgeData.bookings;
  readonly lodges = this.propertyService.accessibleProperties;
  readonly selectedPropertyId = this.propertyService.selectedPropertyId;

  readonly isOwner = this.roleService.isOwner;
  readonly isStaff = this.roleService.isStaff;
  readonly canCreate = computed(
    () => !this.isStaff() || this.permissionService.hasPermission('guest.create'),
  );
  readonly canEdit = computed(
    () => !this.isStaff() || this.permissionService.hasPermission('guest.update'),
  );

  // Filters & Sorting
  readonly searchQuery = signal('');
  readonly typeFilter = signal<'all' | CustomerType>('all');
  readonly statusFilter = signal<'all' | CustomerAccountStatus>('all');
  readonly sortBy = signal<'name' | 'visits' | 'recent'>('recent');
  readonly pageSize = signal(15);

  // ==========================================
  // DYNAMIC STATISTICS (SECTION 3)
  // ==========================================

  readonly totalCustomers = computed(() => this.customers().length);

  readonly newThisMonth = computed(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.customers().filter((c) =>
      (c.createdAt || c.registeredAt || '').startsWith(ym),
    ).length;
  });

  readonly returningCustomers = computed(
    () =>
      this.customers().filter(
        (c) => c.isRepeatCustomer || (c.totalBookings || c.visits || 0) > 1,
      ).length,
  );

  readonly currentlyStaying = computed(() => {
    const checkedIn = this.bookings().filter((b) => b.status === 'Checked-In');
    const uniqueGuests = new Set(
      checkedIn.map((b) => b.customerId || b.guestPhone || b.guestName),
    );
    return uniqueGuests.size;
  });

  readonly vipCustomers = computed(
    () => this.customers().filter((c) => c.customerType === 'VIP').length,
  );

  // ==========================================
  // FILTERED & PAGINATED LISTING
  // ==========================================

  readonly filteredCustomers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const t = this.typeFilter();
    const st = this.statusFilter();
    const sort = this.sortBy();

    const list = this.customers().filter((c) => {
      if (t !== 'all' && (c.customerType || 'Regular') !== t) return false;
      if (st !== 'all' && (c.customerStatus || 'active') !== st) return false;
      if (q) {
        const match =
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'visits') {
        return (b.totalBookings || b.visits || 0) - (a.totalBookings || a.visits || 0);
      }
      return (b.updatedAt || b.createdAt || '').localeCompare(
        a.updatedAt || a.createdAt || '',
      );
    });
  });

  readonly visibleCustomers = computed(() =>
    this.filteredCustomers().slice(0, this.pageSize()),
  );

  readonly hasMore = computed(
    () => this.filteredCustomers().length > this.visibleCustomers().length,
  );

  constructor() {
    addIcons({
      addOutline,
      callOutline,
      createOutline,
      eyeOutline,
      mailOutline,
      peopleOutline,
      personOutline,
      refreshOutline,
      searchOutline,
      starOutline,
    });
  }

  switchLodge(lodgeId: string): void {
    this.propertyService.switchProperty(lodgeId);
  }

  loadMore(): void {
    this.pageSize.update((n) => n + 15);
  }

  goToAdd(): void {
    void this.router.navigate(['/customers/new']);
  }

  viewProfile(c: CustomerItem): void {
    void this.router.navigate(['/customers', c.id]);
  }

  editCustomer(c: CustomerItem): void {
    void this.router.navigate(['/customers', c.id, 'edit']);
  }

  onNavChange(navId: string): void {
    if (navId === 'customers') return;
    if (navId === 'lodges') {
      void this.router.navigate(['/lodges']);
      return;
    }
    if (navId === 'rooms') {
      void this.router.navigate(['/rooms']);
      return;
    }
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
