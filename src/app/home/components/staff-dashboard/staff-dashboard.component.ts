import { Component, computed, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonTextarea,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { CleaningScheduleItem, HousekeepingTaskStatus, RoomItem } from '../../../interface';
import { LodgeDataService } from '../../../services/lodge-data.service';
import { PropertyService } from '../../../services/property.service';
import { RoleService } from '../../../services/role.service';
import { AppToastService } from '../../../shared/services/app-toast.service';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';

@Component({
  selector: 'app-staff-dashboard',
  templateUrl: './staff-dashboard.component.html',
  styleUrls: ['./staff-dashboard.component.scss'],
  imports: [
    FormsModule,
    UpperCasePipe,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonTextarea,
    TranslatePipe,
    DashboardSectionCardComponent,
  ],
})
export class StaffDashboardComponent {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly roleService = inject(RoleService);
  private readonly propertyService = inject(PropertyService);
  private readonly appToast = inject(AppToastService);

  readonly userProfile = this.roleService.currentUserProfile;
  readonly staffName = computed(() => this.userProfile()?.name || 'Staff Member');
  readonly designation = computed(() => this.userProfile()?.designation || 'Staff');
  readonly propertyName = this.propertyService.selectedPropertyName;

  readonly activeFilter = signal<'all' | 'pending' | 'completed'>('all');

  // Housekeeping & Cleaning Tasks for this staff / lodge
  readonly tasks = computed<CleaningScheduleItem[]>(() => {
    const list = this.lodgeData.housekeeping();
    const filter = this.activeFilter();

    if (filter === 'pending') {
      return list.filter((t) => t.status === 'Pending' || t.status === 'In Progress');
    }
    if (filter === 'completed') {
      return list.filter((t) => t.status === 'Completed');
    }
    return list;
  });

  readonly pendingCount = computed(() =>
    this.lodgeData.housekeeping().filter((t) => t.status !== 'Completed').length,
  );

  readonly completedCount = computed(() =>
    this.lodgeData.housekeeping().filter((t) => t.status === 'Completed').length,
  );

  readonly assignedRooms = computed<RoomItem[]>(() => {
    return this.lodgeData.rooms().slice(0, 6);
  });

  // Maintenance Report Modal
  readonly isMaintenanceModalOpen = signal(false);
  maintenanceRoom = '';
  maintenanceDescription = '';

  openMaintenanceModal(room?: string): void {
    this.maintenanceRoom = room || '';
    this.maintenanceDescription = '';
    this.isMaintenanceModalOpen.set(true);
  }

  closeMaintenanceModal(): void {
    this.isMaintenanceModalOpen.set(false);
  }

  async updateTaskStatus(task: CleaningScheduleItem, newStatus: HousekeepingTaskStatus): Promise<void> {
    try {
      await this.lodgeData.updateHousekeepingStatus(task.id, newStatus, task.room);
      await this.appToast.show(
        newStatus === 'Completed' ? 'STAFF_DASH.TASK_COMPLETED' : 'STAFF_DASH.TASK_UPDATED',
        2000,
        'success',
      );
    } catch {
      await this.appToast.show('STAFF_DASH.UPDATE_ERROR', 2000, 'danger');
    }
  }

  async submitMaintenance(): Promise<void> {
    if (!this.maintenanceRoom.trim() || !this.maintenanceDescription.trim()) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 2000, 'warning');
      return;
    }

    // Set target room to Maintenance
    const room = this.lodgeData.rooms().find((r) => r.number === this.maintenanceRoom.trim());
    if (room) {
      await this.lodgeData.updateRoomStatus(room.id, 'Maintenance');
    }

    this.closeMaintenanceModal();
    await this.appToast.show('STAFF_DASH.MAINTENANCE_REPORTED', 2500, 'success');
  }
}
