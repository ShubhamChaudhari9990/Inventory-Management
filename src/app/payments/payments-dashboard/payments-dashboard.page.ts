import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  barChartOutline,
  cardOutline,
  documentTextOutline,
  listOutline,
  returnDownBackOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  DashboardAxisChartComponent,
  DashboardDonutChartComponent,
} from '../../home/components/dashboard-charts/dashboard-charts.component';
import {
  AxisChartOptions,
  DonutChartOptions,
} from '../../home/data/dashboard-charts.data';
import { BillingService } from '../../services/billing.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-payments-dashboard',
  templateUrl: './payments-dashboard.page.html',
  styleUrls: ['./payments-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    AppShellComponent,
    DashboardAxisChartComponent,
    DashboardDonutChartComponent,
  ],
})
export class PaymentsDashboardPage {
  private readonly router = inject(Router);
  private readonly billingService = inject(BillingService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly permissionService = inject(PermissionService);

  readonly isOwner = this.roleService.isOwner;
  readonly isManager = this.roleService.isManager;
  readonly isStaff = this.roleService.isStaff;

  readonly canCollect = computed(
    () => !this.isStaff() || this.permissionService.hasPermission('finance.payment.collect'),
  );
  readonly canViewReports = computed(
    () => this.isOwner() || this.permissionService.hasPermission('reports.view'),
  );

  readonly lodges = this.propertyService.accessibleProperties;
  readonly selectedPropertyId = this.propertyService.selectedPropertyId;
  readonly payments = this.billingService.payments;
  readonly refunds = this.billingService.refunds;
  readonly bookings = this.lodgeData.bookings;

  // ==========================================
  // 6 SUMMARY CARDS (DYNAMIC FROM LEDGER)
  // ==========================================

  readonly totalSuccessful = computed(() =>
    this.payments()
      .filter((p) => p.status === 'Paid' && p.type !== 'Refund')
      .reduce((s, p) => s + (Number(p.numericAmount) || this.billingService.parseCurrency(p.amount)), 0),
  );

  readonly totalRefunds = computed(() =>
    this.refunds()
      .filter((r) => r.refundStatus === 'Completed')
      .reduce((s, r) => s + (Number(r.refundAmount) || 0), 0),
  );

  readonly totalRevenue = computed(() =>
    Math.max(0, this.totalSuccessful() - this.totalRefunds()),
  );

  readonly todayCollection = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.payments()
      .filter(
        (p) =>
          p.status === 'Paid' &&
          p.type !== 'Refund' &&
          (p.paymentDate || p.createdAt.slice(0, 10)) === today,
      )
      .reduce((s, p) => s + (Number(p.numericAmount) || 0), 0);
  });

  readonly monthlyCollection = computed(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return this.payments()
      .filter(
        (p) =>
          p.status === 'Paid' &&
          p.type !== 'Refund' &&
          (p.paymentDate || p.createdAt).startsWith(ym),
      )
      .reduce((s, p) => s + (Number(p.numericAmount) || 0), 0);
  });

  readonly pendingPaymentsCount = computed(
    () => this.payments().filter((p) => p.status === 'Pending').length,
  );

  readonly outstandingBalance = computed(() =>
    this.bookings()
      .filter((b) => b.status !== 'Cancelled')
      .reduce((sum, b) => sum + this.billingService.computeBookingLedger(b).outstandingBalance, 0),
  );

  readonly pendingAlerts = computed(() =>
    this.bookings()
      .filter((b) => b.status !== 'Cancelled')
      .map((b) => ({
        booking: b,
        ledger: this.billingService.computeBookingLedger(b),
      }))
      .filter((x) => x.ledger.outstandingBalance > 0)
      .slice(0, 5),
  );

  readonly recentTransactions = computed(() =>
    [...this.payments()]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 6),
  );

  readonly lodgeComparison = computed(() => {
    return this.lodges().map((l) => {
      const lPay = this.billingService
        .allPayments()
        .filter((p) => p.propertyId === l.id && p.status === 'Paid' && p.type !== 'Refund')
        .reduce((s, p) => s + (Number(p.numericAmount) || 0), 0);
      const lRef = this.refunds()
        .filter((r) => r.propertyId === l.id && r.refundStatus === 'Completed')
        .reduce((s, r) => s + (Number(r.refundAmount) || 0), 0);
      return {
        id: l.id,
        name: l.name,
        collected: lPay,
        refunded: lRef,
        netRevenue: Math.max(0, lPay - lRef),
      };
    });
  });

  // ==========================================
  // CHARTS
  // ==========================================

  readonly dailyRevenueChart = computed<AxisChartOptions>(() => {
    const categories: string[] = [];
    const data: number[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      categories.push(iso.slice(5));
      const sum = this.payments()
        .filter(
          (p) =>
            p.status === 'Paid' &&
            p.type !== 'Refund' &&
            (p.paymentDate || p.createdAt.slice(0, 10)) === iso,
        )
        .reduce((s, p) => s + (Number(p.numericAmount) || 0), 0);
      data.push(sum);
    }
    return this.buildAxisChart('area', 'Collection (₹)', categories, data, '#1d3e9f');
  });

  readonly monthlyCollectionChart = computed<AxisChartOptions>(() => {
    const categories: string[] = [];
    const data: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      categories.push(ym);
      const sum = this.payments()
        .filter(
          (p) =>
            p.status === 'Paid' &&
            p.type !== 'Refund' &&
            (p.paymentDate || p.createdAt).startsWith(ym),
        )
        .reduce((s, p) => s + (Number(p.numericAmount) || 0), 0);
      data.push(sum);
    }
    return this.buildAxisChart('bar', 'Monthly (₹)', categories, data, '#059669');
  });

  readonly methodBreakdownChart = computed<DonutChartOptions>(() => {
    const counts = new Map<string, number>();
    for (const p of this.payments().filter((x) => x.status === 'Paid')) {
      counts.set(p.method, (counts.get(p.method) || 0) + (Number(p.numericAmount) || 0));
    }
    const labels = Array.from(counts.keys());
    const series = Array.from(counts.values());
    return {
      series: series.length ? series : [1],
      labels: labels.length ? labels : ['No Payments'],
      colors: ['#1d3e9f', '#059669', '#f59e0b', '#6366f1', '#ec4899', '#64748b'],
      chart: { type: 'donut', height: 240 },
      stroke: { width: 2, colors: ['#ffffff'] },
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '68%' } } },
      tooltip: { enabled: true },
    };
  });

  private buildAxisChart(
    type: 'bar' | 'area',
    name: string,
    categories: string[],
    data: number[],
    color: string,
  ): AxisChartOptions {
    return {
      series: [{ name, data }],
      chart: { type, height: 240, toolbar: { show: false } },
      xaxis: { categories },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      colors: [color],
      stroke: type === 'area' ? { curve: 'smooth', width: 2 } : { show: false },
      plotOptions: { bar: { borderRadius: 6, columnWidth: '48%' } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#f1f5f9' },
      legend: { show: false },
      tooltip: { enabled: true },
      fill: type === 'area' ? { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } } : { opacity: 1 },
      markers: { size: type === 'area' ? 3 : 0 },
      responsive: [],
    };
  }

  constructor() {
    addIcons({
      addOutline,
      alertCircleOutline,
      barChartOutline,
      cardOutline,
      documentTextOutline,
      listOutline,
      returnDownBackOutline,
    });
  }

  switchLodge(lodgeId: string): void {
    this.propertyService.switchProperty(lodgeId);
  }

  goTo(path: string, bookingId?: string): void {
    void this.router.navigate([path], bookingId ? { queryParams: { bookingId } } : undefined);
  }

  onNavChange(navId: string): void {
    if (navId === 'payments') return;
    if (navId === 'lodges') { void this.router.navigate(['/lodges']); return; }
    if (navId === 'rooms') { void this.router.navigate(['/rooms']); return; }
    if (navId === 'customers') { void this.router.navigate(['/customers']); return; }
    const role = this.roleService.currentRole();
    const target =
      role === 'owner'
        ? '/owner/dashboard'
        : role === 'manager'
          ? '/manager/dashboard'
          : '/staff/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
