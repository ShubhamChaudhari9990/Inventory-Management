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
import { PurchaseOrderItem, PurchaseOrderLineItem } from '../../interface';

@Component({
  selector: 'app-purchase-orders',
  templateUrl: './purchase-orders.page.html',
  styleUrls: ['./purchase-orders.page.scss'],
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
export class PurchaseOrdersPage {
  private readonly route = inject(ActivatedRoute);
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly showForm = signal(false);
  readonly saving = signal(false);

  readonly lodgeId = signal('');
  readonly supplierId = signal('');
  readonly selectedItemId = signal('');
  readonly lineQty = signal(1);
  readonly linePrice = signal(0);
  readonly draftLines = signal<PurchaseOrderLineItem[]>([]);
  readonly tax = signal(0);
  readonly discount = signal(0);
  readonly expectedDate = signal('');
  readonly notes = signal('');
  readonly linkedWorkOrderId = signal(
    this.route.snapshot.queryParamMap.get('workOrderId') || '',
  );

  // Receiving modal/section
  readonly receivingPo = signal<PurchaseOrderItem | null>(null);
  readonly receiveMap = signal<Record<string, number>>({});
  readonly invoiceNo = signal('');
  readonly recordExpense = signal(true);

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );
  readonly activeSuppliers = this.opsInventory.activeSuppliers;
  readonly purchaseOrders = this.opsInventory.purchaseOrders;

  readonly lodgeItems = computed(() => {
    const lid = this.lodgeId();
    if (!lid) return [];
    return this.opsInventory.items().filter((i) => i.propertyId === lid);
  });

  readonly canManage = computed(
    () => this.roleService.isOwner() || this.roleService.isManager(),
  );

  constructor() {
    const qpProp = this.route.snapshot.queryParamMap.get('propertyId');
    if (qpProp) {
      this.lodgeId.set(qpProp);
      this.showForm.set(true);
    } else if (this.accessibleProperties()[0]) {
      this.lodgeId.set(this.accessibleProperties()[0].id);
    }
  }

  addLine(): void {
    const item = this.lodgeItems().find((i) => i.id === this.selectedItemId());
    if (!item || this.lineQty() <= 0) return;

    const line: PurchaseOrderLineItem = {
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      unit: item.unit,
      orderedQty: Number(this.lineQty()),
      receivedQty: 0,
      unitPrice: Number(this.linePrice() || item.purchasePrice || 0),
    };
    this.draftLines.update((arr) => [...arr, line]);
    this.selectedItemId.set('');
    this.lineQty.set(1);
    this.linePrice.set(0);
  }

  removeLine(idx: number): void {
    this.draftLines.update((arr) => arr.filter((_, i) => i !== idx));
  }

  async createPO(): Promise<void> {
    const sup = this.activeSuppliers().find((s) => s.id === this.supplierId());
    if (!this.lodgeId() || !sup || this.draftLines().length === 0) {
      await this.toast.warning('Select lodge, supplier, and at least one item.');
      return;
    }

    this.saving.set(true);
    try {
      await this.opsInventory.createPurchaseOrder({
        propertyId: this.lodgeId(),
        supplierId: sup.id,
        supplierName: sup.name,
        items: this.draftLines(),
        tax: Number(this.tax() || 0),
        discount: Number(this.discount() || 0),
        expectedDeliveryDate: this.expectedDate() || undefined,
        linkedWorkOrderId: this.linkedWorkOrderId() || undefined,
        notes: this.notes().trim() || undefined,
      });
      await this.toast.success('Purchase Order created');
      this.draftLines.set([]);
      this.showForm.set(false);
    } catch {
      await this.toast.error('Failed to create Purchase Order');
    } finally {
      this.saving.set(false);
    }
  }

  async approvePO(poId: string): Promise<void> {
    await this.opsInventory.updatePurchaseOrderStatus(poId, 'Approved');
    await this.toast.success('Purchase Order approved');
  }

  async markOrdered(poId: string): Promise<void> {
    await this.opsInventory.updatePurchaseOrderStatus(poId, 'Ordered');
    await this.toast.success('Purchase Order marked Ordered');
  }

  openReceive(po: PurchaseOrderItem): void {
    this.receivingPo.set(po);
    const map: Record<string, number> = {};
    for (const line of po.items) {
      map[line.itemId] = Math.max(0, line.orderedQty - (line.receivedQty || 0));
    }
    this.receiveMap.set(map);
    this.invoiceNo.set('');
  }

  setReceiveQty(itemId: string, val: number): void {
    this.receiveMap.update((m) => ({ ...m, [itemId]: Number(val || 0) }));
  }

  async confirmReceive(): Promise<void> {
    const po = this.receivingPo();
    if (!po) return;
    this.saving.set(true);
    try {
      await this.opsInventory.receivePurchaseOrderItems({
        poId: po.id,
        receivedMap: this.receiveMap(),
        invoiceNumber: this.invoiceNo().trim() || undefined,
        recordExpense: this.recordExpense(),
      });
      await this.toast.success('Stock receipt confirmed and inventory updated');
      this.receivingPo.set(null);
    } catch (err: any) {
      await this.toast.error(err?.message || 'Receipt failed');
    } finally {
      this.saving.set(false);
    }
  }
}
