import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { paymentMethodLabelKey } from '../../../shared/i18n/label-keys';
import {
  REVENUE_METHODS_CHART,
  REVENUE_PERIOD_LABEL_KEYS,
  REVENUE_PERIODS,
  REVENUE_SUBTITLE_KEYS,
  RevenuePayment,
  RevenuePeriod,
} from '../../data/revenue.data';
import {
  DashboardAxisChartComponent,
  DashboardDonutChartComponent,
} from '../dashboard-charts/dashboard-charts.component';
import {
  AxisChartOptions,
  DonutChartOptions,
  buildDynamicMonthlyRevenueChart,
} from '../../data/dashboard-charts.data';
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
  readonly activePeriod = signal<RevenuePeriod>('month');

  readonly dynamicPayments = computed<RevenuePayment[]>(() => {
    return this.lodgeData.revenuePayments();
  });

  get payments() {
    return this.dynamicPayments();
  }

  readonly dynamicKpis = computed(() => {
    const list = this.lodgeData.payments();
    const cashTotal = list
      .filter((p) => p.method === 'Cash' && p.status === 'Paid')
      .reduce((sum, p) => sum + p.numericAmount, 0);

    const upiTotal = list
      .filter((p) => p.method === 'UPI' && p.status === 'Paid')
      .reduce((sum, p) => sum + p.numericAmount, 0);

    const cardTotal = list
      .filter((p) => (p.method === 'Credit Card' || p.method === 'Debit Card') && p.status === 'Paid')
      .reduce((sum, p) => sum + p.numericAmount, 0);

    const bankTotal = list
      .filter((p) => p.method === 'Bank Transfer' && p.status === 'Paid')
      .reduce((sum, p) => sum + p.numericAmount, 0);

    return [
      {
        id: 'cash',
        label: 'DASHBOARD.METHOD.CASH',
        value: `₹${cashTotal.toLocaleString('en-IN')}`,
        icon: 'cash-outline',
        tone: 'success' as const,
      },
      {
        id: 'upi',
        label: 'DASHBOARD.METHOD.UPI',
        value: `₹${upiTotal.toLocaleString('en-IN')}`,
        icon: 'qr-code-outline',
        tone: 'primary' as const,
      },
      {
        id: 'card',
        label: 'DASHBOARD.METHOD.CARD',
        value: `₹${cardTotal.toLocaleString('en-IN')}`,
        icon: 'card-outline',
        tone: 'warm' as const,
      },
      {
        id: 'bank',
        label: 'DASHBOARD.METHOD.BANK',
        value: `₹${bankTotal.toLocaleString('en-IN')}`,
        icon: 'business-outline',
        tone: 'primary' as const,
      },
    ];
  });

  get kpis() {
    return this.dynamicKpis();
  }

  readonly dynamicMethodsChart = computed<DonutChartOptions>(() => {
    const list = this.lodgeData.payments();
    const upi = list.filter((p) => p.method === 'UPI').length;
    const cash = list.filter((p) => p.method === 'Cash').length;
    const card = list.filter((p) => p.method.includes('Card')).length;
    const bank = list.filter((p) => p.method === 'Bank Transfer').length;

    return {
      ...REVENUE_METHODS_CHART,
      series: [upi, cash, card, bank],
    };
  });

  get methodsChart() {
    return this.dynamicMethodsChart();
  }

  readonly dynamicMonthlyChart = computed<AxisChartOptions>(() => {
    return buildDynamicMonthlyRevenueChart(this.lodgeData.payments());
  });

  get monthlyChart(): AxisChartOptions {
    return this.dynamicMonthlyChart();
  }

  readonly paymentMethodLabelKey = paymentMethodLabelKey;

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
