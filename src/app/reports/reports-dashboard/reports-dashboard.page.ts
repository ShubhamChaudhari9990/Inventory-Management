import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { NgApexchartsModule } from 'ng-apexcharts';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  checkmarkCircleOutline,
  bedOutline,
  cashOutline,
  walletOutline,
  alertCircleOutline,
  returnDownBackOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import { ReportsAnalyticsService } from '../../services/reports-analytics.service';
import { RoleService } from '../../services/role.service';
import { ReportFilterBarComponent } from '../components/report-filter-bar/report-filter-bar.component';

@Component({
  selector: 'app-reports-dashboard',
  templateUrl: './reports-dashboard.page.html',
  styleUrls: ['./reports-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgApexchartsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonIcon,
    ReportFilterBarComponent,
  ],
})
export class ReportsDashboardPage {
  readonly reportsService = inject(ReportsAnalyticsService);
  readonly roleService = inject(RoleService);

  readonly kpis = this.reportsService.dashboardKpis;
  readonly canViewFinance = this.reportsService.canViewFinancialReports;
  readonly canViewGuests = this.reportsService.canViewGuestReports;

  readonly backHref = computed(() => {
    if (this.roleService.isOwner()) return '/owner/dashboard';
    if (this.roleService.isManager()) return '/manager/dashboard';
    return '/staff/dashboard';
  });

  readonly trendDates = computed(() => {
    const map = new Map<string, { revenue: number; bookings: number }>();
    for (const p of this.reportsService.scopedPayments()) {
      if (p.status !== 'Paid' && p.status !== 'Partially Paid' && p.status !== 'Overpaid') {
        continue;
      }
      const d = (p.paymentDate || p.createdAt || '').slice(0, 10);
      if (!d) continue;
      const curr = map.get(d) ?? { revenue: 0, bookings: 0 };
      curr.revenue += p.numericAmount || 0;
      map.set(d, curr);
    }
    for (const b of this.reportsService.scopedBookings()) {
      if (b.status === 'Cancelled') continue;
      const d = (b.checkIn || b.createdAt || '').slice(0, 10);
      if (!d) continue;
      const curr = map.get(d) ?? { revenue: 0, bookings: 0 };
      curr.bookings += 1;
      map.set(d, curr);
    }
    const keys = Array.from(map.keys()).sort().slice(-14);
    return {
      labels: keys,
      revenues: keys.map((k) => Math.round(map.get(k)?.revenue || 0)),
      bookings: keys.map((k) => map.get(k)?.bookings || 0),
    };
  });

  readonly revenueChartOptions = computed(() => ({
    series: [{ name: 'Collections (₹)', data: this.trendDates().revenues }],
    chart: { type: 'area' as const, height: 220, toolbar: { show: false } },
    xaxis: { categories: this.trendDates().labels },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const, width: 2 },
    colors: ['#1d4ed8'],
  }));

  readonly bookingChartOptions = computed(() => ({
    series: [{ name: 'Bookings', data: this.trendDates().bookings }],
    chart: { type: 'bar' as const, height: 220, toolbar: { show: false } },
    xaxis: { categories: this.trendDates().labels },
    dataLabels: { enabled: false },
    colors: ['#15803d'],
  }));

  readonly lodgeComparison = computed(() => {
    const props = this.reportsService.accessibleProperties();
    const bookings = this.reportsService.scopedBookings();
    const payments = this.reportsService.scopedPayments();

    return props.map((p) => {
      const pBookings = bookings.filter((b) => b.propertyId === p.id && b.status !== 'Cancelled');
      const pCollections = payments
        .filter(
          (pay) =>
            pay.propertyId === p.id &&
            (pay.status === 'Paid' || pay.status === 'Partially Paid' || pay.status === 'Overpaid'),
        )
        .reduce((s, pay) => s + (pay.numericAmount || 0), 0);

      return {
        id: p.id,
        name: p.name,
        bookings: pBookings.length,
        bookingValue: pBookings.reduce(
          (s, b) => s + this.reportsService.parseAmount(b.totalAmount ?? b.amount),
          0,
        ),
        collections: Math.round(pCollections),
      };
    });
  });

  constructor() {
    addIcons({
      calendarOutline,
      checkmarkCircleOutline,
      bedOutline,
      cashOutline,
      walletOutline,
      alertCircleOutline,
      returnDownBackOutline,
      closeCircleOutline,
    });
  }
}
