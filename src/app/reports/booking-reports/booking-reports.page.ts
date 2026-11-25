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
  selector: 'app-booking-reports',
  templateUrl: './booking-reports.page.html',
  styleUrls: ['./booking-reports.page.scss'],
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
export class BookingReportsPage {
  readonly reportsService = inject(ReportsAnalyticsService);

  readonly searchQuery = signal('');
  readonly statusFilter = signal('all');
  readonly channelFilter = signal('all');
  readonly page = signal(1);
  readonly pageSize = 15;

  readonly occupancy = this.reportsService.occupancyMetrics;

  readonly summary = computed(() => {
    const list = this.reportsService.scopedBookings();
    return {
      total: list.length,
      confirmed: list.filter((b) => b.status === 'Confirmed').length,
      checkedIn: list.filter((b) => b.status === 'Checked-In').length,
      checkedOut: list.filter((b) => b.status === 'Checked-Out').length,
      cancelled: list.filter((b) => b.status === 'Cancelled').length,
    };
  });

  readonly channelBreakdown = computed(() => {
    const map = new Map<string, number>();
    for (const b of this.reportsService.scopedBookings()) {
      if (b.status === 'Cancelled') continue;
      map.set(b.channel, (map.get(b.channel) || 0) + 1);
    }
    return Array.from(map.entries()).map(([channel, count]) => ({ channel, count }));
  });

  readonly roomTypeBreakdown = computed(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const b of this.reportsService.scopedBookings()) {
      if (b.status === 'Cancelled') continue;
      const rt = b.roomType || 'Standard';
      const curr = map.get(rt) ?? { count: 0, revenue: 0 };
      curr.count++;
      curr.revenue += this.reportsService.parseAmount(b.totalAmount ?? b.amount);
      map.set(rt, curr);
    }
    return Array.from(map.entries()).map(([roomType, v]) => ({ roomType, ...v }));
  });

  readonly filteredBookings = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    const ch = this.channelFilter();

    return this.reportsService.scopedBookings().filter((b) => {
      if (st !== 'all' && b.status !== st) return false;
      if (ch !== 'all' && b.channel !== ch) return false;
      if (q) {
        const hay = `${b.guestName} ${b.room} ${b.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredBookings().length / this.pageSize)),
  );

  readonly pagedBookings = computed(() => {
    const p = Math.min(this.page(), this.totalPages());
    const start = (p - 1) * this.pageSize;
    return this.filteredBookings().slice(start, start + this.pageSize);
  });

  export(format: 'csv' | 'pdf'): void {
    const f = this.reportsService.filter();
    const meta = {
      reportName: 'Booking & Occupancy Report',
      lodgeLabel: this.reportsService.lodgeLabel(),
      startDate: f.startDate,
      endDate: f.endDate,
      headers: ['Booking ID', 'Guest', 'Room', 'Check-In', 'Check-Out', 'Source', 'Status', 'Amount'],
      rows: this.filteredBookings().map((b) => [
        b.id,
        b.guestName,
        b.room,
        b.checkIn,
        b.checkOut,
        b.channel,
        b.status,
        this.reportsService.parseAmount(b.totalAmount ?? b.amount),
      ]),
    };
    if (format === 'csv') this.reportsService.exportCsv(meta);
    else this.reportsService.exportPdf(meta);
  }
}
