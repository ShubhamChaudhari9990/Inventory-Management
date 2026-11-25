import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  CUSTOMER_VIEW_SUBTITLE,
  CustomerItem,
} from '../../data/customers.data';
import { LodgeDataService } from '../../../services/lodge-data.service';
import { AppToastService } from '../../../shared/services/app-toast.service';

@Component({
  selector: 'app-customers-view',
  templateUrl: './customers-view.component.html',
  styleUrls: ['./customers-view.component.scss'],
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonModal, TranslatePipe],
})
export class CustomersViewComponent {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly appToast = inject(AppToastService);

  readonly subtitle = CUSTOMER_VIEW_SUBTITLE;
  readonly customers = this.lodgeData.customers;
  readonly bookings = this.lodgeData.bookings;

  readonly statusLabelKey = statusLabelKey;

  readonly query = signal('');
  readonly isAddModalOpen = signal(false);
  readonly isDetailsModalOpen = signal(false);
  readonly isEditModalOpen = signal(false);
  readonly activeCustomer = signal<CustomerItem | null>(null);

  // Form State
  formName = '';
  formPhone = '';
  formEmail = '';
  formCity = '';
  formAddress = '';
  formIdType: 'Aadhaar' | 'Passport' | 'Driving License' | 'Voter ID' = 'Aadhaar';
  formIdNumber = '';
  formNotes = '';

  // Edit State
  editId = '';
  editName = '';
  editPhone = '';
  editCity = '';
  editAddress = '';
  editNotes = '';

  readonly filteredCustomers = computed(() => {
    const query = this.query().trim().toLowerCase();
    const list = this.customers();
    if (!query) {
      return list;
    }

    return list.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.city.toLowerCase().includes(query) ||
        customer.idType.toLowerCase().includes(query) ||
        customer.idNumber.toLowerCase().includes(query) ||
        customer.status.toLowerCase().includes(query),
    );
  });

  readonly customerBookings = computed(() => {
    const active = this.activeCustomer();
    if (!active) return [];
    return this.bookings().filter(
      (b) =>
        b.guestName.toLowerCase() === active.name.toLowerCase() ||
        (active.phone && b.guestPhone === active.phone)
    );
  });

  onQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.query.set(target?.value ?? '');
  }

  openAddModal(): void {
    this.formName = '';
    this.formPhone = '';
    this.formEmail = '';
    this.formCity = '';
    this.formAddress = '';
    this.formIdType = 'Aadhaar';
    this.formIdNumber = '';
    this.formNotes = '';
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  openDetails(customer: CustomerItem, event: Event): void {
    event.stopPropagation();
    this.activeCustomer.set(customer);
    this.isDetailsModalOpen.set(true);
  }

  closeDetails(): void {
    this.isDetailsModalOpen.set(false);
    this.activeCustomer.set(null);
  }

  openEditModal(customer: CustomerItem, event: Event): void {
    event.stopPropagation();
    this.editId = customer.id;
    this.editName = customer.name;
    this.editPhone = customer.phone;
    this.editCity = customer.city;
    this.editAddress = customer.address || '';
    this.editNotes = customer.notes || '';
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  async saveCustomer(): Promise<void> {
    if (!this.formName.trim() || !this.formPhone.trim()) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 2500, 'warning');
      return;
    }

    const initials = this.formName
      .trim()
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    try {
      await this.lodgeData.addCustomer({
        name: this.formName.trim(),
        phone: this.formPhone.trim(),
        email: this.formEmail.trim() || undefined,
        city: this.formCity.trim() || 'Kolhapur',
        address: this.formAddress.trim() || undefined,
        idType: this.formIdType,
        idNumber: this.formIdNumber.trim() || 'Verified',
        notes: this.formNotes.trim() || undefined,
        initials: initials || 'GU',
        status: 'Paid',
        visits: 1,
        due: '₹0',
      });

      this.closeAddModal();
      await this.appToast.show('Customer added successfully.', 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding customer';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  async saveEditCustomer(): Promise<void> {
    if (!this.editName.trim() || !this.editPhone.trim()) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 2500, 'warning');
      return;
    }

    try {
      await this.lodgeData.updateCustomer(this.editId, {
        name: this.editName.trim(),
        phone: this.editPhone.trim(),
        city: this.editCity.trim(),
        address: this.editAddress.trim() || undefined,
        notes: this.editNotes.trim() || undefined,
      });

      this.closeEditModal();
      await this.appToast.show('Customer details updated.', 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating customer';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  trackCustomer(_: number, customer: CustomerItem): string {
    return customer.id;
  }
}
