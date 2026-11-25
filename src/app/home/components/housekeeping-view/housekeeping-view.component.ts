import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  CLEANING_CHECKLIST_DEFAULT,
  ChecklistItem,
  CleaningScheduleItem,
  HOUSEKEEPING_KPIS,
  HOUSEKEEPING_VIEW_SUBTITLE,
} from '../../data/housekeeping.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';
import { LodgeDataService } from '../../../services/lodge-data.service';
import { AppToastService } from '../../../shared/services/app-toast.service';
import { CleaningPriority, HousekeepingTaskStatus } from '../../../interface';

@Component({
  selector: 'app-housekeeping-view',
  templateUrl: './housekeeping-view.component.html',
  styleUrls: ['./housekeeping-view.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    IonButton,
    IonIcon,
    IonModal,
    TranslatePipe,
  ],
})
export class HousekeepingViewComponent {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly appToast = inject(AppToastService);

  readonly subtitle = HOUSEKEEPING_VIEW_SUBTITLE;
  readonly staffMembers = this.lodgeData.staff;
  readonly rooms = this.lodgeData.rooms;

  readonly isNewTaskOpen = signal(false);

  // Form
  formRoom = '101';
  formAssignee = '';
  formPriority: CleaningPriority = 'Medium';
  formNotes = '';

  get schedule() {
    return this.lodgeData.housekeeping();
  }

  readonly dynamicKpis = computed(() => {
    const list = this.schedule;
    const completedCount = list.filter((i) => i.status === 'Completed' || (i as any).status === 'Verified').length;
    const pendingCount = list.filter((i) => i.status === 'Pending').length;
    const totalCount = list.length;

    return HOUSEKEEPING_KPIS.map((kpi) => {
      if (kpi.id === 'cleaning') return { ...kpi, value: String(totalCount) };
      if (kpi.id === 'completed') return { ...kpi, value: String(completedCount) };
      if (kpi.id === 'pending') return { ...kpi, value: String(pendingCount) };
      return kpi;
    });
  });

  get kpis() {
    return this.dynamicKpis();
  }

  readonly statusLabelKey = statusLabelKey;

  readonly checklist = signal<ChecklistItem[]>(
    CLEANING_CHECKLIST_DEFAULT.map((item) => ({ ...item })),
  );

  toggleChecklist(id: string): void {
    this.checklist.update((items) =>
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  }

  openNewTask(): void {
    const availableStaff = this.staffMembers();
    this.formAssignee = availableStaff[0]?.name || 'Staff Member';
    const cleaningRooms = this.rooms().filter((r) => r.status === 'Cleaning');
    this.formRoom = cleaningRooms[0]?.number || (this.rooms()[0]?.number ?? '101');
    this.isNewTaskOpen.set(true);
  }

  closeNewTask(): void {
    this.isNewTaskOpen.set(false);
  }

  async saveNewTask(): Promise<void> {
    try {
      await this.lodgeData.addHousekeepingTask({
        propertyId: 'all',
        room: this.formRoom,
        assignedTo: this.formAssignee,
        priority: this.formPriority,
        notes: this.formNotes.trim() || undefined,
      });

      this.closeNewTask();
      await this.appToast.show('Cleaning task dispatched.', 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating task';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  async updateStatus(task: CleaningScheduleItem, newStatus: HousekeepingTaskStatus, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.lodgeData.updateHousekeepingStatus(task.id, newStatus);
      if (newStatus === 'Verified') {
        await this.appToast.show(`Room ${task.room} verified & marked Available!`, 2500, 'success');
      } else {
        await this.appToast.show(`Task status updated to ${newStatus}.`, 2000, 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating task';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  trackSchedule(_: number, item: CleaningScheduleItem): string {
    return item.id;
  }

  trackChecklist(_: number, item: ChecklistItem): string {
    return item.id;
  }
}
