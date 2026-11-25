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
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-stock-transfers',
  templateUrl: './stock-transfers.page.html',
  styleUrls: ['./stock-transfers.page.scss'],
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
export class StockTransfersPage {
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly showForm = signal(false);
  readonly saving = signal(false);

  readonly srcLodgeId = signal('');
  readonly dstLodgeId = signal('');
  readonly itemId = signal('');
  readonly qty = signal(1);
  readonly notes = signal('');

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly sourceItems = computed(() => {
    const src = this.srcLodgeId();
    if (!src) return [];
    return this.opsInventory
      .items()
      .filter((i) => i.propertyId === src && (i.quantity || 0) > 0);
  });

  readonly transfers = this.opsInventory.stockTransfers;

  readonly canManage = computed(
    () => this.roleService.isOwner() || this.roleService.isManager(),
  );

  async createTransfer(): Promise<void> {
    const srcItem = this.sourceItems().find((i) => i.id === this.itemId());
    if (!this.srcLodgeId() || !this.dstLodgeId() || !srcItem || this.qty() <= 0) {
      await this.toast.warning('Select source lodge, destination lodge, item, and valid quantity.');
      return;
    }

    this.saving.set(true);
    try {
      await this.opsInventory.createStockTransfer({
        sourcePropertyId: this.srcLodgeId(),
        destinationPropertyId: this.dstLodgeId(),
        sourceItem: srcItem,
        quantity: Number(this.qty()),
        notes: this.notes().trim() || undefined,
      });
      await this.toast.success('Stock transfer requested');
      this.qty.set(1);
      this.notes.set('');
      this.showForm.set(false);
    } catch (err: any) {
      await this.toast.error(err?.message || 'Failed to create transfer');
    } finally {
      this.saving.set(false);
    }
  }

  async approve(id: string): Promise<void> {
    try {
      await this.opsInventory.approveStockTransfer(id);
      await this.toast.success('Transfer approved');
    } catch (err: any) {
      await this.toast.error(err?.message || 'Approval failed');
    }
  }

  async dispatch(id: string): Promise<void> {
    try {
      await this.opsInventory.dispatchStockTransfer(id);
      await this.toast.success('Transfer dispatched (stock moved to transit)');
    } catch (err: any) {
      await this.toast.error(err?.message || 'Dispatch failed');
    }
  }

  async receive(id: string): Promise<void> {
    try {
      await this.opsInventory.receiveStockTransfer(id);
      await this.toast.success('Transfer received at destination lodge');
    } catch (err: any) {
      await this.toast.error(err?.message || 'Receipt failed');
    }
  }

  async reject(id: string): Promise<void> {
    try {
      await this.opsInventory.rejectOrCancelTransfer(id, 'Rejected', 'Rejected by approver');
      await this.toast.warning('Transfer rejected');
    } catch (err: any) {
      await this.toast.error(err?.message || 'Action failed');
    }
  }
}
