import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  constructOutline,
  cubeOutline,
  warningOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  swapHorizontalOutline,
  cartOutline,
  businessOutline,
  barChartOutline,
} from 'ionicons/icons';
import { MaintenanceService } from '../../services/maintenance.service';
import { OperationsInventoryService } from '../../services/operations-inventory.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { LodgeDataService } from '../../services/lodge-data.service';

@Component({
  selector: 'app-operations-dashboard',
  templateUrl: './operations-dashboard.page.html',
  styleUrls: ['./operations-dashboard.page.scss'],
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
export class OperationsDashboardPage {
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly router = inject(Router);

  readonly selectedLodge = signal<string>('all');

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly backHref = computed(() => {
    if (this.roleService.isOwner()) return '/owner/dashboard';
    if (this.roleService.isManager()) return '/manager/dashboard';
    return '/staff/dashboard';
  });

  readonly filteredRequests = computed(() => {
    const lid = this.selectedLodge();
    const list = this.maintenanceService.requests();
    return lid === 'all' ? list : list.filter((r) => r.propertyId === lid);
  });

  readonly filteredWorkOrders = computed(() => {
    const lid = this.selectedLodge();
    const list = this.maintenanceService.workOrders();
    return lid === 'all' ? list : list.filter((w) => w.propertyId === lid);
  });

  readonly filteredItems = computed(() => {
    const lid = this.selectedLodge();
    const list = this.opsInventory.items();
    return lid === 'all' ? list : list.filter((i) => i.propertyId === lid);
  });

  readonly filteredMovements = computed(() => {
    const lid = this.selectedLodge();
    const list = this.opsInventory.movements();
    return lid === 'all' ? list : list.filter((m) => m.propertyId === lid);
  });

  readonly filteredPOs = computed(() => {
    const lid = this.selectedLodge();
    const list = this.opsInventory.purchaseOrders();
    return lid === 'all' ? list : list.filter((p) => p.propertyId === lid);
  });

  readonly maintenanceKpis = computed(() => {
    const reqs = this.filteredRequests();
    const wos = this.filteredWorkOrders();
    const rooms = this.maintenanceService.rooms().filter((r) => {
      const lid = this.selectedLodge();
      return lid === 'all' || r.propertyId === lid;
    });
    const currentMonth = new Date().toISOString().slice(0, 7);

    const monthlyWoCost = wos
      .filter((w) => (w.createdAt || '').slice(0, 7) === currentMonth)
      .reduce((s, w) => s + (w.totalCost || 0), 0);

    const monthlyExpenseCost = this.lodgeData
      .expenseItems()
      .filter(
        (e) =>
          !e.isReversed &&
          e.category === 'Maintenance' &&
          (e.expenseDate || '').slice(0, 7) === currentMonth &&
          (this.selectedLodge() === 'all' || e.propertyId === this.selectedLodge()),
      )
      .reduce((s, e) => s + (e.numericAmount || 0), 0);

    return {
      totalRequests: reqs.length,
      pendingRequests: reqs.filter(
        (r) => r.status === 'Reported' || r.status === 'Approved',
      ).length,
      inProgress: wos.filter(
        (w) => w.status === 'In Progress' || w.status === 'Waiting for Parts',
      ).length,
      completed: wos.filter(
        (w) =>
          w.status === 'Completed' ||
          w.status === 'Verified' ||
          w.status === 'Closed',
      ).length,
      emergencyRequests: reqs.filter(
        (r) =>
          r.priority === 'Emergency' &&
          r.status !== 'Verified' &&
          r.status !== 'Cancelled' &&
          r.status !== 'Rejected',
      ).length,
      roomsUnderMaintenance: rooms.filter(
        (r) =>
          r.status === 'Maintenance' || r.operationalStatus === 'maintenance',
      ).length,
      monthlyExpenses: Math.max(monthlyWoCost, monthlyExpenseCost),
    };
  });

  readonly inventoryKpis = computed(() => {
    const items = this.filteredItems();
    const pos = this.filteredPOs();
    const movs = this.filteredMovements();
    const currentMonth = new Date().toISOString().slice(0, 7);

    const totalStockQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const lowStock = items.filter(
      (i) => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.min || 0),
    ).length;
    const outOfStock = items.filter((i) => (i.quantity || 0) <= 0).length;
    const stockValue = items.reduce(
      (s, i) => s + (i.quantity || 0) * (i.purchasePrice || 0),
      0,
    );
    const pendingPOs = pos.filter(
      (p) =>
        p.status === 'Pending Approval' ||
        p.status === 'Approved' ||
        p.status === 'Ordered' ||
        p.status === 'Partially Received',
    ).length;
    const issuedThisMonth = movs
      .filter(
        (m) =>
          (m.movementType === 'Issue Out' || m.type === 'Consumption') &&
          (m.timestamp || m.createdAt || '').slice(0, 7) === currentMonth,
      )
      .reduce((s, m) => s + Math.abs(m.change || m.quantity || 0), 0);

    return {
      totalItems: items.length,
      totalStockQty,
      lowStock,
      outOfStock,
      pendingPOs,
      stockValue,
      issuedThisMonth,
    };
  });

  readonly recentRequests = computed(() => this.filteredRequests().slice(0, 5));
  readonly pendingWorkOrders = computed(() =>
    this.filteredWorkOrders()
      .filter(
        (w) =>
          w.status === 'Assigned' ||
          w.status === 'In Progress' ||
          w.status === 'Waiting for Parts',
      )
      .slice(0, 5),
  );
  readonly lowStockAlerts = computed(() =>
    this.opsInventory
      .stockAlerts()
      .filter(
        (a) =>
          this.selectedLodge() === 'all' ||
          a.item.propertyId === this.selectedLodge(),
      )
      .slice(0, 6),
  );
  readonly recentMovements = computed(() => this.filteredMovements().slice(0, 6));
  readonly upcomingDeliveries = computed(() =>
    this.filteredPOs()
      .filter(
        (p) =>
          p.status === 'Ordered' ||
          p.status === 'Approved' ||
          p.status === 'Partially Received',
      )
      .slice(0, 5),
  );

  readonly lodgeSummary = computed(() =>
    this.accessibleProperties().map((prop) => {
      const items = this.opsInventory
        .items()
        .filter((i) => i.propertyId === prop.id);
      const value = items.reduce(
        (s, i) => s + (i.quantity || 0) * (i.purchasePrice || 0),
        0,
      );
      const low = items.filter((i) => (i.quantity || 0) <= (i.min || 0)).length;
      return {
        id: prop.id,
        name: prop.name,
        itemCount: items.length,
        totalQty: items.reduce((s, i) => s + (i.quantity || 0), 0),
        lowStock: low,
        value,
      };
    }),
  );

  constructor() {
    addIcons({
      constructOutline,
      cubeOutline,
      warningOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      swapHorizontalOutline,
      cartOutline,
      businessOutline,
      barChartOutline,
    });
  }

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.accessibleProperties().find((p) => p.id === propertyId)?.name ||
      propertyId
    );
  }

  openRequest(id: string): void {
    this.router.navigate(['/maintenance/requests', id]);
  }

  openWorkOrder(id: string): void {
    this.router.navigate(['/maintenance/work-orders', id]);
  }
}
