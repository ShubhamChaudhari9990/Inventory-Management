import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ReportsAnalyticsService } from '../../services/reports-analytics.service';
import { OperationsInventoryService } from '../../services/operations-inventory.service';
import { ReportFilterBarComponent } from '../components/report-filter-bar/report-filter-bar.component';

@Component({
  selector: 'app-rep-inventory-reports',
  templateUrl: './inventory-reports.page.html',
  styleUrls: ['./inventory-reports.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    ReportFilterBarComponent,
  ],
})
export class RepInventoryReportsPage {
  readonly reportsService = inject(ReportsAnalyticsService);
  private readonly opsInventory = inject(OperationsInventoryService);

  readonly summary = computed(() => {
    const items = this.reportsService.scopedItems();
    const movs = this.reportsService.scopedMovements();
    const isAllLodges = this.reportsService.filter().lodgeId === 'all';

    // Exclude inter-lodge transfers from business-wide consumption
    const inward = movs
      .filter(
        (m) =>
          (m.change || 0) > 0 &&
          (!isAllLodges || m.movementType !== 'Transfer In'),
      )
      .reduce((s, m) => s + (m.change || m.quantity || 0), 0);

    const outward = movs
      .filter(
        (m) =>
          (m.change || 0) < 0 &&
          (!isAllLodges || m.movementType !== 'Transfer Out'),
      )
      .reduce((s, m) => s + Math.abs(m.change || m.quantity || 0), 0);

    const now = Date.now();
    const soon = now + 30 * 86400000;
    const expiring = items.filter((i) => {
      if (!i.expiryDate) return false;
      const ms = Date.parse(i.expiryDate);
      return !Number.isNaN(ms) && ms <= soon;
    }).length;

    return {
      totalItems: items.length,
      currentStock: items.reduce((s, i) => s + (i.quantity || 0), 0),
      lowStock: items.filter((i) => (i.quantity || 0) <= (i.min || 0)).length,
      expiring,
      inward,
      outward,
      valuation: items.reduce(
        (s, i) => s + (i.quantity || 0) * (i.purchasePrice || 0),
        0,
      ),
      transfers: this.opsInventory.stockTransfers().length,
    };
  });

  readonly supplierPurchases = computed(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const po of this.opsInventory.purchaseOrders()) {
      if (po.status === 'Cancelled') continue;
      if (
        this.reportsService.filter().lodgeId !== 'all' &&
        po.propertyId !== this.reportsService.filter().lodgeId
      ) {
        continue;
      }
      const curr = map.get(po.supplierName) ?? { count: 0, total: 0 };
      curr.count++;
      curr.total += po.total || 0;
      map.set(po.supplierName, curr);
    }
    return Array.from(map.entries()).map(([supplier, v]) => ({ supplier, ...v }));
  });

  export(format: 'csv' | 'pdf'): void {
    const f = this.reportsService.filter();
    const meta = {
      reportName: 'Inventory Valuation & Stock Report',
      lodgeLabel: this.reportsService.lodgeLabel(),
      startDate: f.startDate,
      endDate: f.endDate,
      headers: ['Item', 'Category', 'Quantity', 'Unit', 'Min', 'Unit Cost', 'Valuation'],
      rows: this.reportsService.scopedItems().map((i) => [
        i.name,
        i.category,
        i.quantity,
        i.unit,
        i.min,
        i.purchasePrice || 0,
        (i.quantity || 0) * (i.purchasePrice || 0),
      ]),
    };
    if (format === 'csv') this.reportsService.exportCsv(meta);
    else this.reportsService.exportPdf(meta);
  }
}
