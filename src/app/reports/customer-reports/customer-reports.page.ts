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
  selector: 'app-customer-reports',
  templateUrl: './customer-reports.page.html',
  styleUrls: ['./customer-reports.page.scss'],
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
export class CustomerReportsPage {
  readonly reportsService = inject(ReportsAnalyticsService);

  readonly canView = this.reportsService.canViewGuestReports;

  readonly customerMetrics = computed(() => {
    const customers = this.reportsService.scopedCustomers();
    const bookings = this.reportsService
      .scopedBookings()
      .filter((b) => b.status !== 'Cancelled');

    const { startDate, endDate } = this.reportsService.filter();
    const newCustomers = customers.filter((c) => {
      const created = (c.createdAt || '').slice(0, 10);
      return created >= startDate && created <= endDate;
    }).length;

    const guestAgg = new Map<
      string,
      { name: string; bookings: number; value: number }
    >();
    for (const b of bookings) {
      const key = b.customerId || b.guestPhone || b.guestName;
      const curr = guestAgg.get(key) ?? {
        name: b.guestName,
        bookings: 0,
        value: 0,
      };
      curr.bookings++;
      curr.value += this.reportsService.parseAmount(b.totalAmount ?? b.amount);
      guestAgg.set(key, curr);
    }

    const activeGuests = Array.from(guestAgg.values());
    const returning = activeGuests.filter((g) => g.bookings > 1).length;
    const repeatRate =
      activeGuests.length > 0
        ? Math.round((returning / activeGuests.length) * 1000) / 10
        : 0;
    const avgBookingVal =
      bookings.length > 0
        ? Math.round(
            bookings.reduce(
              (s, b) =>
                s + this.reportsService.parseAmount(b.totalAmount ?? b.amount),
              0,
            ) / bookings.length,
          )
        : 0;

    return {
      totalCustomers: customers.length,
      newCustomers,
      returningCustomers: returning,
      repeatRate,
      avgBookingValue: avgBookingVal,
      topCustomers: activeGuests.sort((a, b) => b.value - a.value).slice(0, 10),
    };
  });

  export(format: 'csv' | 'pdf'): void {
    const f = this.reportsService.filter();
    const meta = {
      reportName: 'Customer Analytics Report',
      lodgeLabel: this.reportsService.lodgeLabel(),
      startDate: f.startDate,
      endDate: f.endDate,
      headers: ['Guest Name', 'Bookings in Period', 'Total Booking Value'],
      rows: this.customerMetrics().topCustomers.map((c) => [
        c.name,
        c.bookings,
        Math.round(c.value),
      ]),
    };
    if (format === 'csv') this.reportsService.exportCsv(meta);
    else this.reportsService.exportPdf(meta);
  }
}
