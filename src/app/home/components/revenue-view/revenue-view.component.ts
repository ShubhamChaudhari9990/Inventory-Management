import { Component, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { paymentMethodLabelKey } from '../../../shared/i18n/label-keys';
import {
  REVENUE_KPIS,
  REVENUE_METHODS_CHART,
  REVENUE_MONTHLY_CHART,
  REVENUE_PERIOD_LABEL_KEYS,
  REVENUE_PERIODS,
  REVENUE_RECENT_PAYMENTS,
  REVENUE_SUBTITLE_KEYS,
  RevenuePayment,
  RevenuePeriod,
} from '../../data/revenue.data';
import {
  DashboardAxisChartComponent,
  DashboardDonutChartComponent,
} from '../dashboard-charts/dashboard-charts.component';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';

@Component({
  selector: 'app-revenue-view',
  templateUrl: './revenue-view.component.html',
  styleUrls: ['./revenue-view.component.scss'],
  imports: [
    DashboardAxisChartComponent,
    DashboardDonutChartComponent,
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    TranslatePipe,
  ],
})
export class RevenueViewComponent {
  readonly periods = REVENUE_PERIODS;
  readonly periodLabelKeys = REVENUE_PERIOD_LABEL_KEYS;
  readonly kpis = REVENUE_KPIS;
  readonly monthlyChart = REVENUE_MONTHLY_CHART;
  readonly methodsChart = REVENUE_METHODS_CHART;
  readonly payments = REVENUE_RECENT_PAYMENTS;
  readonly paymentMethodLabelKey = paymentMethodLabelKey;

  readonly activePeriod = signal<RevenuePeriod>('month');

  readonly subtitleKey = computed(
    () => REVENUE_SUBTITLE_KEYS[this.activePeriod()],
  );

  setPeriod(period: RevenuePeriod): void {
    this.activePeriod.set(period);
  }

  trackPayment(_: number, payment: RevenuePayment): string {
    return payment.id;
  }
}
