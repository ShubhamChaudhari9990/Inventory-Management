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
import { downloadOutline, barChartOutline } from 'ionicons/icons';
import { HousekeepingService } from '../../services/housekeeping.service';
import { PropertyService } from '../../services/property.service';

@Component({
  selector: 'app-housekeeping-reports',
  templateUrl: './housekeeping-reports.page.html',
  styleUrls: ['./housekeeping-reports.page.scss'],
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
export class HousekeepingReportsPage {
  private readonly hkService = inject(HousekeepingService);
  private readonly propertyService = inject(PropertyService);

  readonly lodgeFilter = signal<string>('all');

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly filteredTasks = computed(() => {
    const lid = this.lodgeFilter();
    const tasks = this.hkService.tasks();
    return lid === 'all' ? tasks : tasks.filter((t) => t.propertyId === lid);
  });

  readonly filteredInspections = computed(() => {
    const lid = this.lodgeFilter();
    const insps = this.hkService.inspections();
    return lid === 'all' ? insps : insps.filter((i) => i.propertyId === lid);
  });

  // 1. Daily Cleaning Summary
  readonly dailySummary = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTasks = this.filteredTasks().filter(
      (t) =>
        (t.createdAt || '').slice(0, 10) === today ||
        (t.completedAt || '').slice(0, 10) === today,
    );
    return {
      total: todayTasks.length,
      completed: todayTasks.filter(
        (t) => t.status === 'Completed' || t.status === 'Approved' || t.status === 'Verified',
      ).length,
      inProgress: todayTasks.filter((t) => t.status === 'In Progress').length,
      pending: todayTasks.filter(
        (t) => t.status === 'Pending' || t.status === 'Assigned',
      ).length,
    };
  });

  // 2. Pending Tasks
  readonly pendingTasks = computed(() =>
    this.filteredTasks().filter(
      (t) =>
        t.status === 'Pending' ||
        t.status === 'Assigned' ||
        t.status === 'In Progress',
    ),
  );

  // 3. Overdue Tasks
  readonly overdueTasks = computed(() => {
    const now = Date.now();
    return this.filteredTasks().filter((t) => {
      if (
        t.status === 'Completed' ||
        t.status === 'Approved' ||
        t.status === 'Verified' ||
        t.status === 'Cancelled'
      ) {
        return false;
      }
      if (t.dueAt) {
        const ms = Date.parse(t.dueAt);
        return !Number.isNaN(ms) && ms < now;
      }
      return false;
    });
  });

  // 4. Staff-wise Completed Tasks
  readonly staffCompleted = computed(() => {
    const map = new Map<string, number>();
    for (const t of this.filteredTasks()) {
      if (t.status === 'Completed' || t.status === 'Approved' || t.status === 'Verified') {
        const name = t.assignedTo || 'Unassigned';
        map.set(name, (map.get(name) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  // 5. Average Cleaning Time (minutes)
  readonly avgCleaningMinutes = computed(() => {
    const durations: number[] = [];
    for (const t of this.filteredTasks()) {
      if (t.startedAt && t.completedAt) {
        const start = Date.parse(t.startedAt);
        const end = Date.parse(t.completedAt);
        if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
          durations.push((end - start) / 60000);
        }
      }
    }
    if (durations.length === 0) return 0;
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return Math.round(avg);
  });

  // 6. Inspection Failure Rate
  readonly inspectionStats = computed(() => {
    const all = this.filteredInspections();
    const rejected = all.filter((i) => i.outcome === 'Rejected').length;
    const approved = all.filter((i) => i.outcome === 'Approved').length;
    const failureRate =
      all.length > 0 ? Math.round((rejected / all.length) * 100) : 0;
    return { total: all.length, approved, rejected, failureRate };
  });

  // 7. Lodge-wise Housekeeping Performance
  readonly lodgePerformance = computed(() =>
    this.accessibleProperties().map((prop) => {
      const rooms = this.hkService
        .rooms()
        .filter((r) => r.propertyId === prop.id);
      const cleanCount = rooms.filter((r) => {
        const s = this.hkService.getRoomHousekeepingStatus(r);
        return s === 'Clean' || s === 'Inspected';
      }).length;
      const tasks = this.hkService
        .tasks()
        .filter((t) => t.propertyId === prop.id);
      const completed = tasks.filter(
        (t) => t.status === 'Completed' || t.status === 'Approved' || t.status === 'Verified',
      ).length;
      return {
        name: prop.name,
        totalRooms: rooms.length,
        cleanRooms: cleanCount,
        totalTasks: tasks.length,
        completedTasks: completed,
      };
    }),
  );

  constructor() {
    addIcons({ downloadOutline, barChartOutline });
  }

  exportCsv(): void {
    const rows = [
      ['Task ID', 'Lodge', 'Room', 'Type', 'Assigned To', 'Priority', 'Status', 'Created At', 'Completed At'],
      ...this.filteredTasks().map((t) => [
        t.id,
        this.accessibleProperties().find((p) => p.id === t.propertyId)?.name || t.propertyId,
        t.room,
        t.taskType || t.type,
        t.assignedTo || 'Unassigned',
        t.priority || 'Medium',
        t.status,
        t.createdAt || '',
        t.completedAt || '',
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `housekeeping-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
