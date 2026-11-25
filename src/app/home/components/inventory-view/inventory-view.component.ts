import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  INVENTORY_KPIS,
  INVENTORY_VIEW_SUBTITLE,
  InventoryItem,
  StockMovement,
} from '../../data/inventory.data';
import { InventoryCategory } from '../../../interface';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { LodgeDataService } from '../../../services/lodge-data.service';
import { AppToastService } from '../../../shared/services/app-toast.service';

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  'Cleaning Supplies',
  'Food & Beverages',
  'Toiletries',
  'Bedding',
  'Furniture',
  'Electrical Items',
  'Maintenance',
  'Other',
];

@Component({
  selector: 'app-inventory-view',
  templateUrl: './inventory-view.component.html',
  styleUrls: ['./inventory-view.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DashboardKpiCardComponent,
    IonButton,
    IonIcon,
    IonModal,
    TranslatePipe,
  ],
})
export class InventoryViewComponent {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly appToast = inject(AppToastService);

  readonly subtitle = INVENTORY_VIEW_SUBTITLE;
  readonly items = this.lodgeData.inventory;
  readonly movements = this.lodgeData.stockMovements;
  readonly categories = INVENTORY_CATEGORIES;

  readonly isAddItemOpen = signal(false);
  readonly isMovementModalOpen = signal(false);
  readonly activeItemForMovement = signal<InventoryItem | null>(null);
  readonly movementType = signal<'Purchase' | 'Consumption' | 'Damage'>('Purchase');

  // Add Item Form
  formItemName = '';
  formCategory: InventoryCategory = 'Toiletries';
  formQuantity = 10;
  formUnit = 'units';
  formMin = 5;
  formPrice = 50;
  formSupplier = '';

  // Movement Form
  moveQuantity = 1;
  moveSupplier = '';
  moveCost = 0;
  movePurpose = '';
  moveDepartment = '';
  moveDamageReason = '';

  readonly dynamicKpis = computed(() => {
    const list = this.items();
    const inStockSum = list.reduce((sum, item) => sum + item.quantity, 0);
    const lowCount = list.filter((i) => i.status === 'Low Stock Alerts' || i.quantity <= i.min).length;
    const categoriesCount = new Set(list.map((i) => i.category)).size;

    return INVENTORY_KPIS.map((kpi) => {
      if (kpi.id === 'in-stock') return { ...kpi, value: String(inStockSum) };
      if (kpi.id === 'low-stock') return { ...kpi, value: String(lowCount) };
      if (kpi.id === 'categories') return { ...kpi, value: String(categoriesCount) };
      return kpi;
    });
  });

  get kpis() {
    return this.dynamicKpis();
  }

  readonly statusLabelKey = statusLabelKey;

  readonly query = signal('');
  readonly lowStockOnly = signal(false);
  readonly selectedCategory = signal<string>('All');

  readonly filteredItems = computed(() => {
    const query = this.query().trim().toLowerCase();
    const lowOnly = this.lowStockOnly();
    const cat = this.selectedCategory();

    return this.items().filter((item) => {
      const matchesLow = !lowOnly || item.status === 'Low Stock Alerts' || item.quantity <= item.min;
      const matchesCat = cat === 'All' || item.category === cat;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query);

      return matchesLow && matchesCat && matchesQuery;
    });
  });

  onQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.query.set(target?.value ?? '');
  }

  toggleLowStockFilter(): void {
    this.lowStockOnly.update((value) => !value);
  }

  openAddItem(): void {
    this.formItemName = '';
    this.formCategory = 'Toiletries';
    this.formQuantity = 10;
    this.formUnit = 'units';
    this.formMin = 5;
    this.formPrice = 50;
    this.formSupplier = '';
    this.isAddItemOpen.set(true);
  }

  closeAddItem(): void {
    this.isAddItemOpen.set(false);
  }

  openMovementModal(item: InventoryItem, type: 'Purchase' | 'Consumption' | 'Damage', event: Event): void {
    event.stopPropagation();
    this.activeItemForMovement.set(item);
    this.movementType.set(type);
    this.moveQuantity = 1;
    this.moveSupplier = item.supplier || '';
    this.moveCost = 0;
    this.movePurpose = '';
    this.moveDepartment = 'Housekeeping';
    this.moveDamageReason = '';
    this.isMovementModalOpen.set(true);
  }

  closeMovementModal(): void {
    this.isMovementModalOpen.set(false);
    this.activeItemForMovement.set(null);
  }

  async saveNewItem(): Promise<void> {
    if (!this.formItemName.trim() || this.formQuantity < 0) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 2500, 'warning');
      return;
    }

    try {
      await this.lodgeData.addInventory({
        name: this.formItemName.trim(),
        category: this.formCategory,
        quantity: Number(this.formQuantity),
        unit: this.formUnit.trim() || 'units',
        min: Number(this.formMin) || 5,
        status: Number(this.formQuantity) <= Number(this.formMin) ? 'Low Stock Alerts' : 'In stock',
        fillPercent: Math.min(100, Math.round((Number(this.formQuantity) / (Number(this.formMin) * 2)) * 100)),
        purchasePrice: Number(this.formPrice) || 0,
        supplier: this.formSupplier.trim() || undefined,
      });

      this.closeAddItem();
      await this.appToast.show('Inventory item created.', 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding item';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  async submitMovement(): Promise<void> {
    const item = this.activeItemForMovement();
    if (!item || this.moveQuantity <= 0) return;

    try {
      const type = this.movementType();
      if (type === 'Purchase') {
        await this.lodgeData.recordStockPurchase(
          item.id,
          Number(this.moveQuantity),
          Number(this.moveCost),
          this.moveSupplier.trim() || undefined
        );
        await this.appToast.show(`Added ${this.moveQuantity} ${item.unit} to stock.`, 2500, 'success');
      } else if (type === 'Consumption') {
        await this.lodgeData.recordStockConsumption(
          item.id,
          Number(this.moveQuantity),
          this.movePurpose.trim() || 'Daily room provisioning'
        );
        await this.appToast.show(`Recorded consumption of ${this.moveQuantity} ${item.unit}.`, 2500, 'success');
      } else if (type === 'Damage') {
        await this.lodgeData.recordStockDamage(
          item.id,
          Number(this.moveQuantity),
          this.moveDamageReason.trim() || 'Damaged / Expired'
        );
        await this.appToast.show(`Recorded ${this.moveQuantity} damaged units.`, 2500, 'success');
      }

      this.closeMovementModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording movement';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  trackItem(_: number, item: InventoryItem): string {
    return item.id;
  }

  trackMovement(_: number, movement: StockMovement): string {
    return movement.id;
  }
}
