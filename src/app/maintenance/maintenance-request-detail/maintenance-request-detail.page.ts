import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-maintenance-request-detail',
  templateUrl: './maintenance-request-detail.page.html',
  styleUrls: ['./maintenance-request-detail.page.scss'],
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
export class MaintenanceRequestDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  private readonly requestId = signal(
    this.route.snapshot.paramMap.get('requestId') || '',
  );

  readonly request = computed(() =>
    this.maintenanceService.requests().find((r) => r.id === this.requestId()),
  );

  readonly canManage = computed(
    () => this.roleService.isOwner() || this.roleService.isManager(),
  );

  readonly lodgeStaff = computed(() => {
    const req = this.request();
    if (!req) return [];
    return this.roleService.registeredUsers().filter((u) => {
      const status = u.accountStatus || u.status;
      if (status !== 'active' && u.role !== 'owner') return false;
      return u.role === 'owner' || (u.propertyIds || []).includes(req.propertyId);
    });
  });

  readonly showWoForm = signal(false);
  readonly techUid = signal('');
  readonly repairDesc = signal('');
  readonly requiredParts = signal('');
  readonly dueDate = signal('');
  readonly rejectionReason = signal('');
  readonly saving = signal(false);

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.propertyService
        .accessibleProperties()
        .find((p) => p.id === propertyId)?.name || propertyId
    );
  }

  async approve(): Promise<void> {
    const req = this.request();
    if (!req) return;
    this.saving.set(true);
    try {
      await this.maintenanceService.reviewRequest(req.id, 'Approved');
      await this.toast.success('Maintenance request approved');
    } catch {
      await this.toast.error('Failed to approve request');
    } finally {
      this.saving.set(false);
    }
  }

  async reject(): Promise<void> {
    const req = this.request();
    if (!req || !this.rejectionReason().trim()) {
      await this.toast.warning('Enter a rejection reason.');
      return;
    }
    this.saving.set(true);
    try {
      await this.maintenanceService.reviewRequest(
        req.id,
        'Rejected',
        this.rejectionReason().trim(),
      );
      await this.toast.success('Maintenance request rejected');
    } catch {
      await this.toast.error('Failed to reject request');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleRoomOutOfService(blocked: boolean): Promise<void> {
    const req = this.request();
    if (!req?.roomId) return;
    try {
      await this.maintenanceService.setRoomMaintenanceBlock(req.roomId, blocked);
      await this.toast.success(
        blocked ? 'Room marked Out of Service' : 'Room maintenance block cleared',
      );
    } catch {
      await this.toast.error('Failed to update room status');
    }
  }

  async convertToWorkOrder(): Promise<void> {
    const req = this.request();
    if (!req || !this.techUid()) {
      await this.toast.warning('Select a technician to assign.');
      return;
    }
    const tech = this.lodgeStaff().find((u) => u.uid === this.techUid());
    this.saving.set(true);
    try {
      const woId = await this.maintenanceService.createWorkOrderFromRequest({
        request: req,
        assignedTechnicianUid: tech?.uid,
        assignedTechnicianName: tech?.name || tech?.email || 'Technician',
        repairDescription: this.repairDesc().trim() || req.description,
        requiredParts: this.requiredParts().trim() || undefined,
        dueDate: this.dueDate() || undefined,
      });
      await this.toast.success('Work order created and technician assigned');
      this.router.navigate(['/maintenance/work-orders', woId]);
    } catch {
      await this.toast.error('Failed to create work order');
    } finally {
      this.saving.set(false);
    }
  }

  openWorkOrder(woId: string): void {
    this.router.navigate(['/maintenance/work-orders', woId]);
  }
}
