import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline } from 'ionicons/icons';
import { OperationsInventoryService } from '../../services/operations-inventory.service';
import { MaintenanceService } from '../../services/maintenance.service';
import { PropertyService } from '../../services/property.service';

@Component({
  selector: 'app-operations-reports',
  templateUrl: './operations-reports.page.html',
  styleUrls: ['./operations-reports.page.scss'],
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
    IonIcon,
  ],
})
export class OperationsReportsPage {
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly propertyService = inject(PropertyService);

  readonly lodgeFilter = signal('all');

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly filteredItems = computed(() => {
    const lid = this.lodgeFilter();
    const list = this.opsInventory.items();
    return lid === 'all' ? list : list.filter((i) => i.propertyId === lid);
  });

  readonly filteredMovements = computed(() => {
    const lid = this.lodgeFilter();
    const list = this.opsInventory.movements();
    return lid === 'all' ? list : list.filter((m) => m.propertyId === lid);
  });

  readonly filteredRequests = computed(() => {
    const lid = this.lodgeFilter();
    const list = this.maintenanceService.requests();
    return lid === 'all' ? list : list.filter((r) => r.propertyId === lid);
  });

  readonly filteredWorkOrders = computed(() => {
    const lid = this.lodgeFilter();
    const list = this.maintenanceService.workOrders();
    return lid === 'all' ? list : list.filter((w) => w.propertyId === lid);
  });

  readonly inventorySummary = computed(() => {
    const items = this.filteredItems();
    const movs = this.filteredMovements();
    const inward = movs
      .filter((m) => (m.change || 0) > 0)
      .reduce((s, m) => s + (m.change || m.quantity || 0), 0);
    const outward = movs
      .filter((m) => (m.change || 0) < 0)
      .reduce((s, m) => s + Math.abs(m.change || m.quantity || 0), 0);

    return {
      totalSkus: items.length,
      totalQty: items.reduce((s, i) => s + (i.quantity || 0), 0),
      lowStock: items.filter((i) => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.min || 0)).length,
      outOfStock: items.filter((i) => (i.quantity || 0) <= 0).length,
      valuation: items.reduce((s, i) => s + (i.quantity || 0) * (i.purchasePrice || 0), 0),
      inward,
      outward,
      transfers: this.opsInventory.stockTransfers().length,
    };
  });

  readonly departmentConsumption = computed(() => {
    const map = new Map<string, number>();
    for (const m of this.filteredMovements()) {
      if ((m.change || 0) < 0) {
        const dept = m.department || 'General';
        map.set(dept, (map.get(dept) || 0) + Math.abs(m.change || m.quantity || 0));
      }
    }
    return Array.from(map.entries()).map(([department, qty]) => ({ department, qty }));
  });

  readonly maintenanceSummary = computed(() => {
    const reqs = this.filteredRequests();
    const wos = this.filteredWorkOrders();
    const now = Date.now();
    const overdue = wos.filter((w) => {
      if (w.status === 'Completed' || w.status === 'Verified' || w.status === 'Closed' || w.status === 'Cancelled') {
        return false;
      }
      return w.dueDate ? Date.parse(w.dueDate) < now : false;
    }).length;

    return {
      totalRequests: reqs.length,
      pendingRequests: reqs.filter((r) => r.status === 'Reported' || r.status === 'Approved').length,
      emergency: reqs.filter((r) => r.priority === 'Emergency').length,
      completedWos: wos.filter((w) => w.status === 'Completed' || w.status === 'Verified' || w.status === 'Closed').length,
      overdueWos: overdue,
      materialCost: wos.reduce((s, w) => s + (w.materialCost || 0), 0),
      labourCost: wos.reduce((s, w) => s + (w.labourCost || 0), 0),
      totalCost: wos.reduce((s, w) => s + (w.totalCost || 0), 0),
    };
  });

  readonly technicianStats = computed(() => {
    const map = new Map<string, { name: string; count: number; cost: number }>();
    for (const w of this.filteredWorkOrders()) {
      const name = w.assignedTechnicianName || 'Unassigned';
      const curr = map.get(name) ?? { name, count: 0, cost: 0 };
      curr.count++;
      curr.cost += w.totalCost || 0;
      map.set(name, curr);
    }
    return Array.from(map.values());
  });

  constructor() {
    addIcons({ downloadOutline });
  }

  exportInventoryCsv(): void {
    const rows = [
      ['Item ID', 'Name', 'SKU', 'Category', 'Quantity', 'Unit', 'Min', 'Unit Price', 'Valuation'],
      ...this.filteredItems().map((i) => [
        i.id,
        i.name,
        i.sku || '',
        i.category,
        i.quantity,
        i.unit,
        i.min,
        i.purchasePrice || 0,
        (i.quantity || 0) * (i.purchasePrice || 0),
      ]),
    ];
    this.downloadCsv(rows, `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  exportMaintenanceCsv(): void {
    const rows = [
      ['Work Order #', 'Category', 'Priority', 'Technician', 'Status', 'Material Cost', 'Labour Cost', 'Total Cost'],
      ...this.filteredWorkOrders().map((w) => [
        w.workOrderNumber,
        w.category,
        w.priority,
        w.assignedTechnicianName,
        w.status,
        w.materialCost,
        w.labourCost,
        w.totalCost,
      ]),
    ];
    this.downloadCsv(rows, `maintenance-report-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  private downloadCsv(rows: (string | number)[][], filename: string): void {
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
