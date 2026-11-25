import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  sparklesOutline,
  bedOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  timeOutline,
  constructOutline,
  clipboardOutline,
  peopleOutline,
  barChartOutline,
  addOutline,
  arrowForwardOutline,
  warningOutline,
  checkmarkDoneOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { HousekeepingService } from '../../services/housekeeping.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { CleaningScheduleItem } from '../../interface';

@Component({
  selector: 'app-housekeeping-dashboard',
  templateUrl: './housekeeping-dashboard.page.html',
  styleUrls: ['./housekeeping-dashboard.page.scss'],
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
export class HousekeepingDashboardPage {
  private readonly hkService = inject(HousekeepingService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly router = inject(Router);

  readonly selectedLodgeFilter = signal<string>('all');

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly filteredRooms = computed(() => {
    const lodgeId = this.selectedLodgeFilter();
    const rooms = this.hkService.rooms();
    return lodgeId === 'all'
      ? rooms
      : rooms.filter((r) => r.propertyId === lodgeId);
  });

  readonly filteredTasks = computed(() => {
    const lodgeId = this.selectedLodgeFilter();
    const tasks = this.hkService.tasks();
    return lodgeId === 'all'
      ? tasks
      : tasks.filter((t) => t.propertyId === lodgeId);
  });

  readonly kpis = computed(() => {
    const rooms = this.filteredRooms();
    const tasks = this.filteredTasks();
    const now = Date.now();

    let clean = 0;
    let dirty = 0;
    let cleaning = 0;
    let inspectionPending = 0;
    let outOfService = 0;

    for (const room of rooms) {
      const s = this.hkService.getRoomHousekeepingStatus(room);
      if (s === 'Clean' || s === 'Inspected') clean++;
      else if (s === 'Dirty') dirty++;
      else if (s === 'Cleaning') cleaning++;
      else if (s === 'Inspection Pending') inspectionPending++;
      else if (s === 'Out of Service') outOfService++;
    }

    const pendingTasks = tasks.filter(
      (t) =>
        t.status === 'Pending' ||
        t.status === 'Assigned' ||
        t.status === 'In Progress' ||
        t.status === 'Rejected',
    ).length;

    const overdueTasks = tasks.filter((t) => {
      if (
        t.status === 'Completed' ||
        t.status === 'Approved' ||
        t.status === 'Verified' ||
        t.status === 'Cancelled'
      ) {
        return false;
      }
      if (t.dueAt) {
        const dueMs = Date.parse(t.dueAt);
        return !Number.isNaN(dueMs) && dueMs < now;
      }
      return false;
    }).length;

    return {
      totalRooms: rooms.length,
      cleanRooms: clean,
      dirtyRooms: dirty,
      cleaningRooms: cleaning,
      inspectionPending,
      outOfService,
      pendingTasks,
      overdueTasks,
    };
  });

  readonly todaysSchedule = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.filteredTasks()
      .filter((t) => {
        const created = (t.createdAt || '').slice(0, 10);
        const due = (t.dueAt || '').slice(0, 10);
        return created === today || due === today || t.status !== 'Approved';
      })
      .slice(0, 8);
  });

  readonly urgentTasks = computed(() =>
    this.filteredTasks().filter(
      (t) =>
        (t.priority === 'Urgent' || t.priority === 'High') &&
        t.status !== 'Completed' &&
        t.status !== 'Approved' &&
        t.status !== 'Verified' &&
        t.status !== 'Cancelled',
    ),
  );

  readonly awaitingInspection = computed(() =>
    this.filteredTasks().filter((t) => t.status === 'Inspection Pending'),
  );

  readonly recentlyCompleted = computed(() =>
    this.filteredTasks()
      .filter(
        (t) =>
          t.status === 'Completed' ||
          t.status === 'Approved' ||
          t.status === 'Verified',
      )
      .slice(0, 6),
  );

  readonly staffAssignments = computed(() => {
    const map = new Map<
      string,
      { name: string; active: number; completed: number; pendingInspection: number }
    >();
    for (const task of this.filteredTasks()) {
      const name = task.assignedTo || 'Unassigned';
      const curr = map.get(name) ?? {
        name,
        active: 0,
        completed: 0,
        pendingInspection: 0,
      };
      if (
        task.status === 'Completed' ||
        task.status === 'Approved' ||
        task.status === 'Verified'
      ) {
        curr.completed++;
      } else if (task.status === 'Inspection Pending') {
        curr.pendingInspection++;
      } else if (task.status !== 'Cancelled') {
        curr.active++;
      }
      map.set(name, curr);
    }
    return Array.from(map.values()).sort((a, b) => b.active - a.active);
  });

  readonly openMaintenanceCount = computed(
    () =>
      this.hkService
        .maintenanceIssues()
        .filter((m) => m.status !== 'Resolved').length,
  );

  readonly canAssign = computed(
    () => this.roleService.isOwner() || this.roleService.isManager(),
  );

  readonly backHref = computed(() => {
    if (this.roleService.isOwner()) return '/owner/dashboard';
    if (this.roleService.isManager()) return '/manager/dashboard';
    return '/staff/dashboard';
  });

  constructor() {
    addIcons({
      sparklesOutline,
      bedOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      timeOutline,
      constructOutline,
      clipboardOutline,
      peopleOutline,
      barChartOutline,
      addOutline,
      arrowForwardOutline,
      warningOutline,
      checkmarkDoneOutline,
      shieldCheckmarkOutline,
    });
  }

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return 'All Lodges';
    return (
      this.accessibleProperties().find((p) => p.id === propertyId)?.name ||
      propertyId
    );
  }

  openTask(task: CleaningScheduleItem): void {
    this.router.navigate(['/housekeeping/tasks', task.id]);
  }
}
