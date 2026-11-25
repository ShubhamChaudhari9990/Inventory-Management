import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import {
  cameraOutline,
  constructOutline,
  cubeOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { MaintenanceService } from '../../services/maintenance.service';
import { OperationsInventoryService } from '../../services/operations-inventory.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-work-order-detail',
  templateUrl: './work-order-detail.page.html',
  styleUrls: ['./work-order-detail.page.scss'],
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
export class WorkOrderDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  private readonly workOrderId = signal(
    this.route.snapshot.paramMap.get('workOrderId') || '',
  );

  readonly workOrder = computed(() =>
    this.maintenanceService.workOrders().find((w) => w.id === this.workOrderId()),
  );

  readonly lodgeItems = computed(() => {
    const wo = this.workOrder();
    if (!wo) return [];
    return this.opsInventory
      .items()
      .filter((i) => i.propertyId === wo.propertyId);
  });

  readonly canManage = computed(
    () => this.roleService.isOwner() || this.roleService.isManager(),
  );

  readonly selectedItemId = signal('');
  readonly issueQty = signal(1);
  readonly issueNotes = signal('');

  readonly labourCost = signal(0);
  readonly completionNotes = signal('');
  readonly afterPhotos = signal<string[]>([]);
  readonly verificationNotes = signal('');
  readonly restoreRoom = signal(true);
  readonly recordLabourExpense = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);

  constructor() {
    addIcons({
      cameraOutline,
      constructOutline,
      cubeOutline,
      checkmarkCircleOutline,
    });
  }

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.propertyService
        .accessibleProperties()
        .find((p) => p.id === propertyId)?.name || propertyId
    );
  }

  async startWork(): Promise<void> {
    const wo = this.workOrder();
    if (!wo) return;
    await this.maintenanceService.updateWorkOrderStatus(wo.id, 'In Progress');
    await this.toast.success('Work order started');
  }

  async markWaitingForParts(): Promise<void> {
    const wo = this.workOrder();
    if (!wo) return;
    await this.maintenanceService.updateWorkOrderStatus(wo.id, 'Waiting for Parts');
    await this.toast.warning('Work order marked Waiting for Parts');
  }

  createPOForParts(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.router.navigate(['/inventory/purchase-orders'], {
      queryParams: { workOrderId: wo.id, propertyId: wo.propertyId },
    });
  }

  async issuePart(): Promise<void> {
    const wo = this.workOrder();
    if (!wo || !this.selectedItemId() || this.issueQty() <= 0) {
      await this.toast.warning('Select an item and valid quantity.');
      return;
    }

    this.saving.set(true);
    try {
      await this.maintenanceService.issuePartToWorkOrder({
        workOrder: wo,
        itemId: this.selectedItemId(),
        quantity: Number(this.issueQty()),
        notes: this.issueNotes().trim() || undefined,
      });
      await this.toast.success('Part issued to work order');
      this.issueQty.set(1);
      this.issueNotes.set('');
    } catch (err: any) {
      await this.toast.error(err?.message || 'Unable to issue part');
    } finally {
      this.saving.set(false);
    }
  }

  async returnUnusedPart(index: number): Promise<void> {
    const wo = this.workOrder();
    if (!wo) return;
    const line = wo.issuedItems[index];
    const remaining = line.quantity - (line.returnedQuantity || 0);
    if (remaining <= 0) return;

    this.saving.set(true);
    try {
      await this.maintenanceService.returnPartFromWorkOrder({
        workOrder: wo,
        issuedIndex: index,
        returnQuantity: 1,
        reason: `Unused part returned from ${wo.workOrderNumber}`,
      });
      await this.toast.success(`Returned 1 ${line.unit} of ${line.itemName}`);
    } catch (err: any) {
      await this.toast.error(err?.message || 'Failed to return part');
    } finally {
      this.saving.set(false);
    }
  }

  async onAfterPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const wo = this.workOrder();
    if (!file || !wo) return;

    this.uploading.set(true);
    try {
      const url = await this.maintenanceService.uploadMaintenancePhoto(
        wo.propertyId,
        wo.id,
        file,
      );
      this.afterPhotos.update((arr) => [...arr, url]);
      await this.toast.success('After photo uploaded');
    } catch {
      await this.toast.error('Photo upload failed');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async completeWork(): Promise<void> {
    const wo = this.workOrder();
    if (!wo) return;
    this.saving.set(true);
    try {
      await this.maintenanceService.completeWorkOrder({
        workOrder: wo,
        labourCost: Number(this.labourCost() || 0),
        completionNotes: this.completionNotes().trim() || 'Repair completed',
        afterPhotos: [...(wo.afterPhotos || []), ...this.afterPhotos()],
      });
      await this.toast.success('Work order marked Completed');
    } catch {
      await this.toast.error('Failed to complete work order');
    } finally {
      this.saving.set(false);
    }
  }

  async verifyAndClose(): Promise<void> {
    const wo = this.workOrder();
    if (!wo) return;
    this.saving.set(true);
    try {
      await this.maintenanceService.verifyAndCloseWorkOrder({
        workOrder: wo,
        verificationNotes: this.verificationNotes().trim(),
        restoreRoomIfClean: this.restoreRoom(),
        recordLabourExpense: this.recordLabourExpense(),
      });
      await this.toast.success('Work order verified and closed');
    } catch {
      await this.toast.error('Failed to verify work order');
    } finally {
      this.saving.set(false);
    }
  }
}
