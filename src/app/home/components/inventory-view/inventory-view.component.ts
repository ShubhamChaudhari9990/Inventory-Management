import { Component, computed, inject, signal } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  INVENTORY_KPIS,
  INVENTORY_VIEW_SUBTITLE,
  InventoryItem,
  STOCK_MOVEMENTS,
  StockMovement,
} from '../../data/inventory.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { LodgeDataService } from '../../../services/lodge-data.service';

@Component({
  selector: 'app-inventory-view',
  templateUrl: './inventory-view.component.html',
  styleUrls: ['./inventory-view.component.scss'],
  imports: [DashboardKpiCardComponent, IonButton, IonIcon, TranslatePipe],
})
export class InventoryViewComponent {
  private readonly lodgeData = inject(LodgeDataService);

  readonly subtitle = INVENTORY_VIEW_SUBTITLE;
  readonly items = this.lodgeData.inventory;
  readonly movements = STOCK_MOVEMENTS;

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

  readonly filteredItems = computed(() => {
    const query = this.query().trim().toLowerCase();
    const lowOnly = this.lowStockOnly();

    return this.items().filter((item) => {
      const matchesFilter = !lowOnly || item.status === 'Low Stock Alerts' || item.quantity <= item.min;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query);

      return matchesFilter && matchesQuery;
    });
  });

  onQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.query.set(target?.value ?? '');
  }

  toggleLowStockFilter(): void {
    this.lowStockOnly.update((value) => !value);
  }

  trackItem(_: number, item: InventoryItem): string {
    return item.id;
  }

  trackMovement(_: number, movement: StockMovement): string {
    return movement.id;
  }
}
