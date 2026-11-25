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
import { MaintenanceService } from '../../services/maintenance.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { WorkOrderStatus } from '../../interface';

@Component({
  selector: 'app-work-orders',
  templateUrl: './work-orders.page.html',
  styleUrls: ['./work-orders.page.scss'],
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
export class WorkOrdersPage {
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);

  readonly lodgeFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly onlyMine = signal(false);

  readonly statuses: WorkOrderStatus[] = [
    'Assigned',
    'In Progress',
    'Waiting for Parts',
    'Completed',
    'Verified',
    'Closed',
    'Cancelled',
  ];

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly filteredWorkOrders = computed(() => {
    const lodge = this.lodgeFilter();
    const status = this.statusFilter();
    const mine = this.onlyMine();
    const uid = this.roleService.currentUserProfile()?.uid;

    return this.maintenanceService.workOrders().filter((w) => {
      if (lodge !== 'all' && w.propertyId !== lodge) return false;
      if (status !== 'all' && w.status !== status) return false;
      if (mine && uid && w.assignedTechnicianUid !== uid) return false;
      return true;
    });
  });

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.accessibleProperties().find((p) => p.id === propertyId)?.name ||
      propertyId
    );
  }

  openWorkOrder(id: string): void {
    this.router.navigate(['/maintenance/work-orders', id]);
  }
}
