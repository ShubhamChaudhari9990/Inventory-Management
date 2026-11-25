import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  callOutline,
  createOutline,
  locationOutline,
  mailOutline,
  powerOutline,
  trashOutline,
} from 'ionicons/icons';
import { Unsubscribe } from 'firebase/firestore';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  CustomerActivityItem,
  CustomerItem,
  CustomerNoteItem,
} from '../../interface';
import { CustomerService } from '../../services/customer.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { RoleService } from '../../services/role.service';
import { PermissionService } from '../../services/permission.service';
import { AppToastService } from '../../shared/services/app-toast.service';

export type CustomerProfileTab =
  | 'overview'
  | 'bookings'
  | 'payments'
  | 'notes'
  | 'activity';

@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.page.html',
  styleUrls: ['./customer-profile.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class CustomerProfilePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly roleService = inject(RoleService);
  private readonly permissionService = inject(PermissionService);
  private readonly toast = inject(AppToastService);

  readonly customerId = signal('');
  readonly activeTab = signal<CustomerProfileTab>('overview');
  readonly notes = signal<CustomerNoteItem[]>([]);
  readonly activity = signal<CustomerActivityItem[]>([]);
  newNoteText = '';

  private notesUnsub: Unsubscribe | null = null;
  private actUnsub: Unsubscribe | null = null;

  readonly isOwner = this.roleService.isOwner;
  readonly isManager = this.roleService.isManager;
  readonly isStaff = this.roleService.isStaff;

  readonly canViewFinance = computed(
    () => this.isOwner() || this.permissionService.hasPermission('finance.view'),
  );
  readonly canEdit = computed(
    () => !this.isStaff() || this.permissionService.hasPermission('guest.update'),
  );
  readonly canViewNotes = computed(() => !this.isStaff() || this.permissionService.hasPermission('guest.view'));

  readonly customer = computed<CustomerItem | undefined>(() =>
    this.customerService.getCustomerById(this.customerId()),
  );

  readonly stats = computed(() => {
    const c = this.customer();
    return c ? this.customerService.computeCustomerStats(c) : null;
  });

  readonly bookings = computed(() => {
    const c = this.customer();
    return c ? this.customerService.getCustomerBookings(c) : [];
  });

  readonly payments = computed(() => {
    if (!this.canViewFinance()) return [];
    const bookingIds = new Set(this.bookings().map((b) => b.id));
    const c = this.customer();
    return this.lodgeData.payments().filter(
      (p) =>
        (!!p.bookingId && bookingIds.has(p.bookingId)) ||
        (c && p.guestName?.toLowerCase() === c.name.toLowerCase()),
    );
  });

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      callOutline,
      createOutline,
      locationOutline,
      mailOutline,
      powerOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('customerId') || '';
    this.customerId.set(id);
    if (id) {
      if (this.canViewNotes()) {
        this.notesUnsub = this.customerService.watchNotes(id, (n) => this.notes.set(n));
      }
      this.actUnsub = this.customerService.watchActivity(id, (a) => this.activity.set(a));
    }
  }

  ngOnDestroy(): void {
    if (this.notesUnsub) this.notesUnsub();
    if (this.actUnsub) this.actUnsub();
  }

  async addNote(): Promise<void> {
    if (!this.newNoteText.trim()) return;
    try {
      await this.customerService.addNote(this.customerId(), this.newNoteText);
      this.newNoteText = '';
      this.toast.success('Internal note added.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to add note.');
    }
  }

  async deleteNote(note: CustomerNoteItem): Promise<void> {
    try {
      await this.customerService.deleteNote(this.customerId(), note.id);
      this.toast.success('Note deleted.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to delete note.');
    }
  }

  async toggleActive(): Promise<void> {
    const c = this.customer();
    if (!c || !this.canEdit()) return;
    const next = c.customerStatus === 'inactive' ? 'active' : 'inactive';
    await this.customerService.updateCustomer(
      c.id,
      { customerStatus: next },
      `Customer status changed to ${next}`,
    );
    this.toast.success(`${c.name} is now ${next}.`);
  }

  goBack(): void {
    void this.router.navigate(['/customers']);
  }

  goToEdit(): void {
    void this.router.navigate(['/customers', this.customerId(), 'edit']);
  }

  onNavChange(navId: string): void {
    if (navId === 'customers') {
      this.goBack();
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
