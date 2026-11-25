import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-revenue-reports',
  templateUrl: './revenue-reports.page.html',
  styleUrls: ['./revenue-reports.page.scss'],
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
    ReportFilterBarComponent,
  ],
})
export class RevenueReportsPage {
  readonly reportsService = inject(ReportsAnalyticsService);

  readonly searchQuery = signal('');
  readonly methodFilter = signal('all');

  readonly canView = this.reportsService.canViewFinancialReports;
  readonly finance = this.reportsService.financialMetrics;

  readonly methodBreakdown = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.reportsService.scopedPayments()) {
      if (p.status !== 'Paid' && p.status !== 'Partially Paid' && p.status !== 'Overpaid') {
        continue;
      }
      map.set(p.method, (map.get(p.method) || 0) + (p.numericAmount || 0));
    }
    return Array.from(map.entries()).map(([method, amount]) => ({
      method,
      amount: Math.round(amount),
    }));
  });

  readonly filteredTransactions = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const meth = this.methodFilter();

    return this.reportsService.scopedPayments().filter((p) => {
      if (meth !== 'all' && p.method !== meth) return false;
      if (q) {
        const hay = `${p.guestName} ${p.receiptNumber || ''} ${p.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  export(format: 'csv' | 'pdf'): void {
    const f = this.reportsService.filter();
    const meta = {
      reportName: 'Revenue & Payment Report',
      lodgeLabel: this.reportsService.lodgeLabel(),
      startDate: f.startDate,
      endDate: f.endDate,
      headers: ['Payment ID', 'Guest', 'Method', 'Type', 'Status', 'Date', 'Amount'],
      rows: this.filteredTransactions().map((p) => [
        p.id,
        p.guestName,
        p.method,
        p.type,
        p.status,
        (p.paymentDate || p.createdAt || '').slice(0, 10),
        p.numericAmount,
      ]),
    };
    if (format === 'csv') this.reportsService.exportCsv(meta);
    else this.reportsService.exportPdf(meta);
  }
}
