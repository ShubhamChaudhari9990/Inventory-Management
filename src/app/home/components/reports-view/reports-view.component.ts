import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { AppToastService } from '../../../shared/services/app-toast.service';
import { isCustomKpiIcon, KPI_CUSTOM_ICONS } from '../../data/kpi-icons.data';
import {
  PROFIT_LOSS_ROWS,
  REPORT_CARDS,
  REPORTS_VIEW_SUBTITLE,
  ProfitLossRow,
  ReportCard,
} from '../../data/reports.data';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';

@Component({
  selector: 'app-reports-view',
  templateUrl: './reports-view.component.html',
  styleUrls: ['./reports-view.component.scss'],
  imports: [DashboardSectionCardComponent, IonIcon, TranslatePipe],
})
export class ReportsViewComponent {
  private readonly appToast = inject(AppToastService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly subtitle = REPORTS_VIEW_SUBTITLE;
  readonly cards = REPORT_CARDS;
  readonly pnlRows = PROFIT_LOSS_ROWS;

  exportPdf(): void {
    void this.appToast.show('REPORTS.PDF_EXPORTED', 2400);
  }

  exportExcel(): void {
    void this.appToast.show('REPORTS.EXCEL_EXPORTED', 2400);
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
