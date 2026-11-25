import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IonIcon, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { AppToastService } from '../../../shared/services/app-toast.service';
import { isCustomKpiIcon, KPI_CUSTOM_ICONS } from '../../data/kpi-icons.data';
import {
  REPORT_CARDS,
  REPORTS_VIEW_SUBTITLE,
  ProfitLossRow,
  ReportCard,
} from '../../data/reports.data';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';
import { LodgeDataService } from '../../../services/lodge-data.service';
import { PropertyService } from '../../../services/property.service';

export type ReportDateFilter = 'today' | 'week' | 'month' | 'last-month' | 'year';

@Component({
  selector: 'app-reports-view',
  templateUrl: './reports-view.component.html',
  styleUrls: ['./reports-view.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DashboardSectionCardComponent,
    IonIcon,
    IonModal,
    TranslatePipe,
  ],
})
export class ReportsViewComponent {
  private readonly appToast = inject(AppToastService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);

  readonly subtitle = REPORTS_VIEW_SUBTITLE;
  readonly cards = REPORT_CARDS;
  readonly selectedPropertyName = this.propertyService.selectedPropertyName;

  readonly selectedFilter = signal<ReportDateFilter>('month');
  readonly activeDetailReport = signal<ReportCard | null>(null);
  readonly isReportModalOpen = signal(false);

  readonly dynamicPnlRows = computed<ProfitLossRow[]>(() => {
    const bookings = this.lodgeData.bookings();
    const expenses = this.lodgeData.expenseItems();

    const roomRevenue = bookings
      .filter((b) => b.status !== 'Cancelled')
      .reduce((sum, b) => {
        const n = Number(b.amount.replace(/[^0-9.-]+/g, '')) || 0;
        return sum + n;
      }, 0);

    const operationalExpenses = expenses
      .filter((e) => !e.isReversed)
      .reduce((sum, e) => sum + (e.numericAmount || 0), 0);

    const netProfit = roomRevenue - operationalExpenses;

    return [
      {
        id: 'rev-rooms',
        labelKey: 'Room Booking Revenue',
        amount: `₹${roomRevenue.toLocaleString('en-IN')}`,
        tone: 'success',
      },
      {
        id: 'exp-operations',
        labelKey: 'Operational & Utility Expenses',
        amount: `-₹${operationalExpenses.toLocaleString('en-IN')}`,
        tone: 'danger',
      },
      {
        id: 'pnl-net',
        labelKey: 'Net Profit / (Loss)',
        amount: `₹${netProfit.toLocaleString('en-IN')}`,
        tone: netProfit >= 0 ? 'success' : 'danger',
      },
    ];
  });

  get pnlRows() {
    return this.dynamicPnlRows();
  }

  openReportDetail(card: ReportCard): void {
    this.activeDetailReport.set(card);
    this.isReportModalOpen.set(true);
  }

  closeReportDetail(): void {
    this.isReportModalOpen.set(false);
    this.activeDetailReport.set(null);
  }

  exportPdf(): void {
    window.print();
    void this.appToast.show('Generating printable PDF report...', 2400, 'success');
  }

  exportExcel(): void {
    const rows = [
      ['LemonWood Lodge Management - Financial & Operational Report'],
      ['Property / Scope', this.selectedPropertyName()],
      ['Generated On', new Date().toLocaleString('en-IN')],
      [''],
      ['Metric / Account', 'Amount (INR)'],
      ...this.pnlRows.map((r) => [r.labelKey, r.amount]),
      [''],
      ['Active Rooms Count', String(this.lodgeData.rooms().length)],
      ['Total Bookings Count', String(this.lodgeData.bookings().length)],
      ['Total Staff Count', String(this.lodgeData.staff().length)],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LemonWood_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    void this.appToast.show('REPORTS.EXCEL_EXPORTED', 2400, 'success');
  }

  printReport(): void {
    window.print();
  }

  isCustomIcon(icon: string): boolean {
    return isCustomKpiIcon(icon);
  }

  customIconHtml(icon: string): SafeHtml | null {
    if (!isCustomKpiIcon(icon)) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustHtml(KPI_CUSTOM_ICONS[icon]);
  }

  trackCard(_: number, card: ReportCard): string {
    return card.id;
  }

  trackRow(_: number, row: ProfitLossRow): string {
    return row.id;
  }
}
