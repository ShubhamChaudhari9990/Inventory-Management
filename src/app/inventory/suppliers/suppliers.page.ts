import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { OperationsInventoryService } from '../../services/operations-inventory.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import { SupplierItem } from '../../interface';

@Component({
  selector: 'app-suppliers',
  templateUrl: './suppliers.page.html',
  styleUrls: ['./suppliers.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
  ],
})
export class SuppliersPage {
  private readonly opsInventory = inject(OperationsInventoryService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);

  readonly name = signal('');
  readonly contactPerson = signal('');
  readonly phone = signal('');
  readonly email = signal('');
  readonly address = signal('');
  readonly gstNumber = signal('');
  readonly categoriesText = signal('');
  readonly notes = signal('');

  readonly suppliers = this.opsInventory.suppliers;
  readonly canManage = computed(
    () => this.roleService.isOwner() || this.roleService.isManager(),
  );

  openNew(): void {
    this.editingId.set(null);
    this.name.set('');
    this.contactPerson.set('');
    this.phone.set('');
    this.email.set('');
    this.address.set('');
    this.gstNumber.set('');
    this.categoriesText.set('');
    this.notes.set('');
    this.showForm.set(true);
  }

  editSupplier(s: SupplierItem): void {
    this.editingId.set(s.id);
    this.name.set(s.name);
    this.contactPerson.set(s.contactPerson);
    this.phone.set(s.phone);
    this.email.set(s.email || '');
    this.address.set(s.address || '');
    this.gstNumber.set(s.gstNumber || '');
    this.categoriesText.set((s.suppliedCategories || []).join(', '));
    this.notes.set(s.notes || '');
    this.showForm.set(true);
  }

  async save(): Promise<void> {
    if (!this.name().trim() || !this.contactPerson().trim() || !this.phone().trim()) {
      await this.toast.warning('Name, Contact Person, and Phone are required.');
      return;
    }

    this.saving.set(true);
    try {
      const cats = this.categoriesText()
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      await this.opsInventory.saveSupplier(
        {
          name: this.name().trim(),
          contactPerson: this.contactPerson().trim(),
          phone: this.phone().trim(),
          email: this.email().trim() || undefined,
          address: this.address().trim() || undefined,
          gstNumber: this.gstNumber().trim() || undefined,
          suppliedCategories: cats,
          notes: this.notes().trim() || undefined,
          status: 'Active',
        },
        this.editingId() || undefined,
      );
      await this.toast.success('Supplier saved');
      this.showForm.set(false);
    } catch {
      await this.toast.error('Failed to save supplier');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleStatus(s: SupplierItem): Promise<void> {
    try {
      await this.opsInventory.toggleSupplierStatus(s);
      await this.toast.success(
        s.status === 'Active' ? 'Supplier deactivated' : 'Supplier reactivated',
      );
    } catch {
      await this.toast.error('Failed to update supplier status');
    }
  }
}
