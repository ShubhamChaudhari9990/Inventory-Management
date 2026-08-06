import { Component, computed, signal } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  INVENTORY_ITEMS,
  INVENTORY_KPIS,
  INVENTORY_VIEW_SUBTITLE,
  InventoryItem,
  STOCK_MOVEMENTS,
  StockMovement,
} from '../../data/inventory.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';

@Component({
  selector: 'app-inventory-view',
  templateUrl: './inventory-view.component.html',
  styleUrls: ['./inventory-view.component.scss'],
  imports: [DashboardKpiCardComponent, IonButton, IonIcon, TranslatePipe],
})
export class InventoryViewComponent {
  readonly subtitle = INVENTORY_VIEW_SUBTITLE;
  readonly kpis = INVENTORY_KPIS;
  readonly items = INVENTORY_ITEMS;
  readonly movements = STOCK_MOVEMENTS;

  readonly statusLabelKey = statusLabelKey;

  readonly query = signal('');
  readonly lowStockOnly = signal(false);

  readonly filteredItems = computed(() => {
    const query = this.query().trim().toLowerCase();
    const lowOnly = this.lowStockOnly();

    return this.items.filter((item) => {
      const matchesFilter = !lowOnly || item.status === 'Low Stock Alerts';
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
