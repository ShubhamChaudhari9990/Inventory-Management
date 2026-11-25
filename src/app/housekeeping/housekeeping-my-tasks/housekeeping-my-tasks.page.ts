import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
  playOutline,
  checkmarkDoneOutline,
  constructOutline,
  cameraOutline,
} from 'ionicons/icons';
import { HousekeepingService } from '../../services/housekeeping.service';
import { RoleService } from '../../services/role.service';
import { PropertyService } from '../../services/property.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import { CleaningScheduleItem } from '../../interface';

@Component({
  selector: 'app-housekeeping-my-tasks',
  templateUrl: './housekeeping-my-tasks.page.html',
  styleUrls: ['./housekeeping-my-tasks.page.scss'],
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
    IonIcon,
  ],
})
export class HousekeepingMyTasksPage {
  private readonly hkService = inject(HousekeepingService);
  private readonly roleService = inject(RoleService);
  private readonly propertyService = inject(PropertyService);
  private readonly toast = inject(AppToastService);
  private readonly router = inject(Router);

  readonly busyTaskId = signal<string | null>(null);

  readonly myTasks = computed(() => {
    const profile = this.roleService.currentUserProfile();
    const uid = profile?.uid;
    const name = (profile?.name || '').toLowerCase();

    return this.hkService.tasks().filter((t) => {
      if (t.status === 'Cancelled') return false;
      if (uid && t.assignedStaffId === uid) return true;
      if (name && (t.assignedTo || '').toLowerCase() === name) return true;
      return false;
    });
  });

  readonly activeTasks = computed(() =>
    this.myTasks().filter(
      (t) =>
        t.status === 'Pending' ||
        t.status === 'Assigned' ||
        t.status === 'In Progress' ||
        t.status === 'Rejected',
    ),
  );

  readonly submittedTasks = computed(() =>
    this.myTasks().filter(
      (t) =>
        t.status === 'Inspection Pending' ||
        t.status === 'Completed' ||
        t.status === 'Approved' ||
        t.status === 'Verified',
    ),
  );

  constructor() {
    addIcons({
      playOutline,
      checkmarkDoneOutline,
      constructOutline,
      cameraOutline,
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

  async startCleaning(task: CleaningScheduleItem): Promise<void> {
    this.busyTaskId.set(task.id);
    try {
      await this.hkService.startCleaning(task);
      await this.toast.success(`Started cleaning Room ${task.room}`);
    } catch {
      await this.toast.error('Unable to start task');
    } finally {
      this.busyTaskId.set(null);
    }
  }

  async submitForInspection(task: CleaningScheduleItem): Promise<void> {
    this.busyTaskId.set(task.id);
    try {
      await this.hkService.completeCleaning(
        task,
        task.notes || 'Completed via My Tasks',
        task.photos || [],
        task.missingItems || [],
        true,
      );
      await this.toast.success(`Room ${task.room} submitted for inspection`);
    } catch {
      await this.toast.error('Unable to submit for inspection');
    } finally {
      this.busyTaskId.set(null);
    }
  }

  openDetail(task: CleaningScheduleItem): void {
    this.router.navigate(['/housekeeping/tasks', task.id]);
  }
}
