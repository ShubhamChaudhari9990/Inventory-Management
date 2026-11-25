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
import { ReportFilterBarComponent } from '../components/report-filter-bar/report-filter-bar.component';

@Component({
  selector: 'app-staff-reports',
  templateUrl: './staff-reports.page.html',
  styleUrls: ['./staff-reports.page.scss'],
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
export class StaffReportsPage {
  readonly reportsService = inject(ReportsAnalyticsService);

  readonly staffRows = computed(() => {
    const map = new Map<
      string,
      {
        name: string;
        assigned: number;
        completed: number;
        pending: number;
        overdue: number;
        hkCompleted: number;
        woCompleted: number;
      }
    >();
    const now = Date.now();

    const ensure = (name: string) => {
      const curr = map.get(name) ?? {
        name,
        assigned: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        hkCompleted: 0,
        woCompleted: 0,
      };
      map.set(name, curr);
      return curr;
    };

    for (const hk of this.reportsService.scopedHousekeeping()) {
      const name = hk.assignedTo || 'Unassigned';
      const row = ensure(name);
      row.assigned++;
      if (hk.status === 'Completed' || hk.status === 'Approved' || hk.status === 'Verified') {
        row.completed++;
        row.hkCompleted++;
      } else if (hk.status !== 'Cancelled') {
        row.pending++;
        if (hk.dueAt && Date.parse(hk.dueAt) < now) row.overdue++;
      }
    }

    for (const wo of this.reportsService.scopedWorkOrders()) {
      const name = wo.assignedTechnicianName || 'Unassigned';
      const row = ensure(name);
      row.assigned++;
      if (wo.status === 'Completed' || wo.status === 'Verified' || wo.status === 'Closed') {
        row.completed++;
        row.woCompleted++;
      } else if (wo.status !== 'Cancelled') {
        row.pending++;
        if (wo.dueDate && Date.parse(wo.dueDate) < now) row.overdue++;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.assigned - a.assigned);
  });

  export(format: 'csv' | 'pdf'): void {
    const f = this.reportsService.filter();
    const meta = {
      reportName: 'Staff Performance Report',
      lodgeLabel: this.reportsService.lodgeLabel(),
      startDate: f.startDate,
      endDate: f.endDate,
      headers: ['Staff', 'Assigned', 'Completed', 'Pending', 'Overdue', 'HK Done', 'Maint Done'],
      rows: this.staffRows().map((r) => [
        r.name,
        r.assigned,
        r.completed,
        r.pending,
        r.overdue,
        r.hkCompleted,
        r.woCompleted,
      ]),
    };
    if (format === 'csv') this.reportsService.exportCsv(meta);
    else this.reportsService.exportPdf(meta);
  }
}
