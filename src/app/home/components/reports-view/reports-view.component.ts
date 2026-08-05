import { Component, inject, OnDestroy, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { isCustomKpiIcon, KPI_CUSTOM_ICONS } from '../../data/kpi-icons.data';
import {
  PROFIT_LOSS_ROWS,
  REPORT_CARDS,
  REPORTS_VIEW_SUBTITLE,
  ProfitLossRow,
  ReportCard,
} from '../../data/reports.data';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';

type ExportToastKind = 'pdf' | 'excel';

@Component({
  selector: 'app-reports-view',
  templateUrl: './reports-view.component.html',
  styleUrls: ['./reports-view.component.scss'],
  imports: [DashboardSectionCardComponent, IonIcon, TranslatePipe],
})
export class ReportsViewComponent implements OnDestroy {
  private static readonly TOAST_DURATION_MS = 2400;

  private readonly sanitizer = inject(DomSanitizer);
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly subtitle = REPORTS_VIEW_SUBTITLE;
  readonly cards = REPORT_CARDS;
  readonly pnlRows = PROFIT_LOSS_ROWS;

  readonly toastMessageKey = signal<string | null>(null);

  ngOnDestroy(): void {
    this.clearToast();
  }

  exportPdf(): void {
    this.showExportToast('pdf');
  }

  exportExcel(): void {
    this.showExportToast('excel');
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

  private showExportToast(kind: ExportToastKind): void {
    const messageKey =
      kind === 'pdf' ? 'REPORTS.PDF_EXPORTED' : 'REPORTS.EXCEL_EXPORTED';

    this.toastMessageKey.set(messageKey);

    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      this.toastMessageKey.set(null);
      this.toastTimeoutId = null;
    }, ReportsViewComponent.TOAST_DURATION_MS);
  }

  private clearToast(): void {
    this.toastMessageKey.set(null);
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }
}
