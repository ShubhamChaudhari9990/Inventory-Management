import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ReportsAnalyticsService } from '../../services/reports-analytics.service';
import { HousekeepingService } from '../../services/housekeeping.service';
import { ReportFilterBarComponent } from '../components/report-filter-bar/report-filter-bar.component';

@Component({
  selector: 'app-rep-operations-reports',
  templateUrl: './operations-reports.page.html',
  styleUrls: ['./operations-reports.page.scss'],
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
    ReportFilterBarComponent,
  ],
})
export class RepOperationsReportsPage {
  readonly reportsService = inject(ReportsAnalyticsService);
  private readonly hkService = inject(HousekeepingService);

  readonly hkStats = computed(() => {
    const tasks = this.reportsService.scopedHousekeeping();
    const completed = tasks.filter(
      (t) => t.status === 'Completed' || t.status === 'Approved' || t.status === 'Verified',
    );
    const durations: number[] = [];
    for (const t of completed) {
      if (t.startedAt && t.completedAt) {
        const s = Date.parse(t.startedAt);
        const e = Date.parse(t.completedAt);
        if (!Number.isNaN(s) && !Number.isNaN(e) && e >= s) {
          durations.push((e - s) / 60000);
        }
      }
    }
    const avgMin = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    const insps = this.hkService.inspections();
    const rejected = insps.filter((i) => i.outcome === 'Rejected').length;

    return {
      total: tasks.length,
      completed: completed.length,
      pending: tasks.filter(
        (t) => t.status === 'Pending' || t.status === 'Assigned' || t.status === 'In Progress',
      ).length,
      avgMinutes: avgMin,
      inspectionsTotal: insps.length,
      inspectionsRejected: rejected,
    };
  });

  readonly maintStats = computed(() => {
    const reqs = this.reportsService.scopedRequests();
    const wos = this.reportsService.scopedWorkOrders();
    const roomsMaint = this.reportsService
      .scopedRooms()
      .filter((r) => r.status === 'Maintenance' || r.operationalStatus === 'maintenance').length;

    return {
      totalRequests: reqs.length,
      pendingRequests: reqs.filter((r) => r.status === 'Reported' || r.status === 'Approved').length,
      completedWos: wos.filter((w) => w.status === 'Completed' || w.status === 'Verified' || w.status === 'Closed').length,
      emergencyRequests: reqs.filter((r) => r.priority === 'Emergency').length,
      roomsUnderMaintenance: roomsMaint,
      totalCost: wos.reduce((s, w) => s + (w.totalCost || 0), 0),
    };
  });

  export(format: 'csv' | 'pdf'): void {
    const f = this.reportsService.filter();
    const meta = {
      reportName: 'Housekeeping & Maintenance Report',
      lodgeLabel: this.reportsService.lodgeLabel(),
      startDate: f.startDate,
      endDate: f.endDate,
      headers: ['Work Order / Task', 'Type', 'Assigned To', 'Status', 'Cost'],
      rows: [
        ...this.reportsService.scopedHousekeeping().map((t) => [
          `Room ${t.room}`,
          `HK: ${t.taskType || t.type}`,
          t.assignedTo || 'Unassigned',
          t.status,
          0,
        ]),
        ...this.reportsService.scopedWorkOrders().map((w) => [
          w.workOrderNumber,
          `Maint: ${w.category}`,
          w.assignedTechnicianName,
          w.status,
          w.totalCost,
        ]),
      ],
    };
    if (format === 'csv') this.reportsService.exportCsv(meta);
    else this.reportsService.exportPdf(meta);
  }
}
