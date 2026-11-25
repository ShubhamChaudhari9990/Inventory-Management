import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
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
import { StockMovement } from '../../interface';

@Component({
  selector: 'app-inventory-item-detail',
  templateUrl: './inventory-item-detail.page.html',
  styleUrls: ['./inventory-item-detail.page.scss'],
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
export class InventoryItemDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  private readonly itemId = signal(
    this.route.snapshot.paramMap.get('itemId') || '',
  );

  readonly item = computed(() =>
    this.opsInventory.items().find((i) => i.id === this.itemId()),
  );

  readonly itemMovements = computed(() =>
    this.opsInventory
      .movements()
      .filter((m) => m.itemId === this.itemId())
      .slice(0, 20),
  );

  readonly canManage = computed(
    () => this.roleService.isOwner() || this.roleService.isManager(),
  );

  // Stock Inward
  readonly inQty = signal(1);
  readonly inPrice = signal(0);
  readonly inSupplier = signal('');
  readonly inInvoice = signal('');
  readonly inNotes = signal('');

  // Stock Outward
  readonly outQty = signal(1);
  readonly outDept = signal<NonNullable<StockMovement['department']>>('Housekeeping');
  readonly outIssuedTo = signal('');
  readonly outReason = signal('');

  // Stock Adjustment
  readonly adjDelta = signal(0);
  readonly adjReason = signal('');

  readonly saving = signal(false);

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.propertyService
        .accessibleProperties()
        .find((p) => p.id === propertyId)?.name || propertyId
    );
  }

  async submitInward(): Promise<void> {
    const it = this.item();
    if (!it || this.inQty() <= 0) {
      await this.toast.warning('Enter a valid received quantity.');
      return;
    }
    this.saving.set(true);
    try {
      await this.opsInventory.recordStockInward({
        itemId: it.id,
        quantity: Number(this.inQty()),
        unitPrice: Number(this.inPrice() || it.purchasePrice || 0),
        supplierName: this.inSupplier().trim() || it.supplier,
        invoiceNumber: this.inInvoice().trim() || undefined,
        notes: this.inNotes().trim() || undefined,
      });
      await this.toast.success('Stock inward recorded');
      this.inQty.set(1);
      this.inNotes.set('');
    } catch (err: any) {
      await this.toast.error(err?.message || 'Failed to record stock inward');
    } finally {
      this.saving.set(false);
    }
  }

  async submitOutward(): Promise<void> {
    const it = this.item();
    if (!it || this.outQty() <= 0 || !this.outIssuedTo().trim()) {
      await this.toast.warning('Enter valid quantity and recipient.');
      return;
    }
    this.saving.set(true);
    try {
      await this.opsInventory.issueStock({
        itemId: it.id,
        quantity: Number(this.outQty()),
        department: this.outDept(),
        issuedTo: this.outIssuedTo().trim(),
        reason: this.outReason().trim() || `Issued to ${this.outDept()}`,
      });
      await this.toast.success('Stock issued successfully');
      this.outQty.set(1);
      this.outReason.set('');
    } catch (err: any) {
      await this.toast.error(err?.message || 'Failed to issue stock');
    } finally {
      this.saving.set(false);
    }
  }

  async submitAdjustment(): Promise<void> {
    const it = this.item();
    if (!it || this.adjDelta() === 0 || !this.adjReason().trim()) {
      await this.toast.warning('Adjustment quantity and reason are required.');
      return;
    }
    this.saving.set(true);
    try {
      await this.opsInventory.adjustStock({
        itemId: it.id,
        delta: Number(this.adjDelta()),
        reason: this.adjReason().trim(),
      });
      await this.toast.success('Stock adjustment applied');
      this.adjDelta.set(0);
      this.adjReason.set('');
    } catch (err: any) {
      await this.toast.error(err?.message || 'Failed to adjust stock');
    } finally {
      this.saving.set(false);
    }
  }
}
