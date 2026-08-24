import { Component, computed, inject, signal } from '@angular/core';
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
import { LodgeDataService } from '../../../services/lodge-data.service';

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
  private readonly lodgeData = inject(LodgeDataService);

  readonly periods = REVENUE_PERIODS;
  readonly periodLabelKeys = REVENUE_PERIOD_LABEL_KEYS;
  readonly kpis = REVENUE_KPIS;
  readonly monthlyChart = REVENUE_MONTHLY_CHART;
  readonly methodsChart = REVENUE_METHODS_CHART;

  readonly dynamicPayments = computed(() => {
    const bookings = this.lodgeData.bookings();
    if (bookings.length === 0) return [...REVENUE_RECENT_PAYMENTS];
    return bookings.map((b, idx) => ({
      id: b.id,
      guest: b.guestName,
      room: `Room ${b.room}`,
      amount: b.amount,
      method: (idx % 2 === 0 ? 'UPI' : 'Cash') as 'UPI' | 'Cash' | 'Card' | 'Bank Transfer',
      status: b.status,
      time: b.checkIn,
    }));
  });

  get payments() {
    return this.dynamicPayments();
  }

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
