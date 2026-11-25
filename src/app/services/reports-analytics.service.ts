import { Injectable, computed, inject, signal } from '@angular/core';
import {
  BookingItem,
  CustomerItem,
  InventoryItem,
  MaintenanceRequestItem,
  PaymentRecord,
  RefundRecord,
  RoomItem,
  StockMovement,
  WorkOrderItem,
} from '../interface';
import { BillingService } from './billing.service';
import { CustomerService } from './customer.service';
import { HousekeepingService } from './housekeeping.service';
import { LodgeDataService } from './lodge-data.service';
import { MaintenanceService } from './maintenance.service';
import { OperationsInventoryService } from './operations-inventory.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom';

export interface ReportFilterState {
  preset: DatePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  lodgeId: string; // 'all' | propertyId
}

export interface ExportMeta {
  reportName: string;
  lodgeLabel: string;
  startDate: string;
  endDate: string;
  headers: string[];
  rows: (string | number)[][];
}

@Injectable({
  providedIn: 'root',
})
export class ReportsAnalyticsService {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly billingService = inject(BillingService);
  private readonly hkService = inject(HousekeepingService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly customerService = inject(CustomerService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  readonly filter = signal<ReportFilterState>(this.buildPresetState('last30', 'all'));

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly canViewFinancialReports = computed(() => {
    if (this.roleService.isOwner() || this.roleService.isManager()) return true;
    const perms = this.roleService.currentUserProfile()?.permissions || [];
    return perms.includes('reports.view') && perms.includes('finance.view');
  });

  readonly canViewGuestReports = computed(() => {
    if (this.roleService.isOwner() || this.roleService.isManager()) return true;
    const perms = this.roleService.currentUserProfile()?.permissions || [];
    return perms.includes('reports.view') && perms.includes('guest.view');
  });

  readonly canExportReports = computed(() => {
    if (this.roleService.isOwner() || this.roleService.isManager()) return true;
    const perms = this.roleService.currentUserProfile()?.permissions || [];
    return perms.includes('reports.export');
  });

  readonly dateRangeError = computed(() => {
    const { startDate, endDate } = this.filter();
    if (!startDate || !endDate) return 'Start and end dates are required.';
    if (startDate > endDate) return 'Start date cannot be after end date.';
    return null;
  });

  readonly daysInRange = computed(() => {
    const { startDate, endDate } = this.filter();
    if (!startDate || !endDate || startDate > endDate) return 0;
    const s = new Date(`${startDate}T00:00:00`);
    const e = new Date(`${endDate}T00:00:00`);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  });

  readonly lodgeLabel = computed(() => {
    const lid = this.filter().lodgeId;
    if (lid === 'all') return 'All Accessible Lodges';
    return (
      this.accessibleProperties().find((p) => p.id === lid)?.name || lid
    );
  });

  // --- Scoped Raw Collections ---
  private inLodgeScope(propertyId?: string): boolean {
    const allowed = new Set(this.accessibleProperties().map((p) => p.id));
    if (!this.roleService.isOwner() && (!propertyId || !allowed.has(propertyId))) {
      return false;
    }
    const sel = this.filter().lodgeId;
    if (sel !== 'all' && propertyId !== sel) return false;
    return true;
  }

  private inDateRange(dateStr?: string, start?: string, end?: string): boolean {
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    const s = start || this.filter().startDate;
    const e = end || this.filter().endDate;
    return d >= s && d <= e;
  }

  readonly scopedRooms = computed<RoomItem[]>(() =>
    this.lodgeData.allRooms().filter((r) => this.inLodgeScope(r.propertyId)),
  );

  readonly scopedBookings = computed<BookingItem[]>(() =>
    this.lodgeData
      .allBookings()
      .filter(
        (b) =>
          this.inLodgeScope(b.propertyId) &&
          (this.inDateRange(b.checkIn) ||
            this.inDateRange(b.createdAt) ||
            (b.checkIn <= this.filter().endDate && b.checkOut > this.filter().startDate)),
      ),
  );

  readonly scopedPayments = computed<PaymentRecord[]>(() =>
    this.lodgeData
      .allPayments()
      .filter(
        (p) =>
          this.inLodgeScope(p.propertyId) &&
          this.inDateRange(p.paymentDate || p.createdAt),
      ),
  );

  readonly scopedRefunds = computed<RefundRecord[]>(() =>
    this.billingService
      .refunds()
      .filter(
        (r) =>
          this.inLodgeScope(r.propertyId) &&
          this.inDateRange(r.createdAt),
      ),
  );

  readonly scopedMovements = computed<StockMovement[]>(() =>
    this.opsInventory
      .movements()
      .filter(
        (m) =>
          this.inLodgeScope(m.propertyId) &&
          this.inDateRange(m.timestamp || m.createdAt),
      ),
  );

  readonly scopedItems = computed<InventoryItem[]>(() =>
    this.opsInventory.items().filter((i) => this.inLodgeScope(i.propertyId)),
  );

  readonly scopedRequests = computed<MaintenanceRequestItem[]>(() =>
    this.maintenanceService
      .requests()
      .filter(
        (r) =>
          this.inLodgeScope(r.propertyId) &&
          this.inDateRange(r.reportedAt),
      ),
  );

  readonly scopedWorkOrders = computed<WorkOrderItem[]>(() =>
    this.maintenanceService
      .workOrders()
      .filter(
        (w) =>
          this.inLodgeScope(w.propertyId) &&
          this.inDateRange(w.createdAt),
      ),
  );

  readonly scopedHousekeeping = computed(() =>
    this.hkService
      .tasks()
      .filter(
        (t) =>
          this.inLodgeScope(t.propertyId) &&
          this.inDateRange(t.createdAt),
      ),
  );

  readonly scopedCustomers = computed<CustomerItem[]>(() =>
    this.customerService.customers().filter((c) => {
      if (this.filter().lodgeId === 'all') return true;
      return !c.propertyId || c.propertyId === this.filter().lodgeId;
    }),
  );

  // --- Accurate Occupancy & Financial Computations ---
  readonly occupancyMetrics = computed(() => {
    const { startDate, endDate } = this.filter();
    const days = this.daysInRange();
    if (days <= 0) {
      return {
        occupiedRoomNights: 0,
        sellableRoomNights: 0,
        occupancyRate: 0,
        accommodationRevenue: 0,
        adr: 0,
        revpar: 0,
      };
    }

    const rooms = this.scopedRooms();
    const sellableRooms = rooms.filter(
      (r) => r.operationalStatus !== 'maintenance' && r.operationalStatus !== 'blocked',
    ).length;
    const sellableRoomNights = sellableRooms * days;

    const rangeStartMs = new Date(`${startDate}T00:00:00`).getTime();
    const rangeEndExclusiveMs = new Date(`${endDate}T00:00:00`).getTime() + 86400000;

    let occupiedRoomNights = 0;
    let accommodationRevenue = 0;

    for (const b of this.scopedBookings()) {
      if (b.status === 'Cancelled') continue;
      const bStart = new Date(`${b.checkIn.slice(0, 10)}T00:00:00`).getTime();
      const bEnd = new Date(`${b.checkOut.slice(0, 10)}T00:00:00`).getTime();
      if (Number.isNaN(bStart) || Number.isNaN(bEnd) || bEnd <= bStart) continue;

      const overlapStart = Math.max(rangeStartMs, bStart);
      const overlapEnd = Math.min(rangeEndExclusiveMs, bEnd);
      if (overlapEnd > overlapStart) {
        const overlapNights = Math.round((overlapEnd - overlapStart) / 86400000);
        const totalBookingNights = Math.max(1, Math.round((bEnd - bStart) / 86400000));
        occupiedRoomNights += overlapNights;
        const bTotal = this.parseAmount(b.totalAmount ?? b.amount);
        accommodationRevenue += (bTotal * overlapNights) / totalBookingNights;
      }
    }

    const occupancyRate =
      sellableRoomNights > 0
        ? Math.min(100, Math.round((occupiedRoomNights / sellableRoomNights) * 1000) / 10)
        : 0;
    const adr =
      occupiedRoomNights > 0
        ? Math.round(accommodationRevenue / occupiedRoomNights)
        : 0;
    const revpar =
      sellableRoomNights > 0
        ? Math.round(accommodationRevenue / sellableRoomNights)
        : 0;

    return {
      occupiedRoomNights,
      sellableRoomNights,
      occupancyRate,
      accommodationRevenue: Math.round(accommodationRevenue),
      adr,
      revpar,
    };
  });

  readonly financialMetrics = computed(() => {
    const bookings = this.scopedBookings();
    const payments = this.scopedPayments();
    const refunds = this.scopedRefunds();

    const activeBookings = bookings.filter((b) => b.status !== 'Cancelled');
    const totalBookingValue = activeBookings.reduce(
      (s, b) => s + this.parseAmount(b.totalAmount ?? b.amount),
      0,
    );

    const successfulPayments = payments.filter(
      (p) =>
        p.status === 'Paid' ||
        p.status === 'Partially Paid' ||
        p.status === 'Overpaid',
    );
    const totalCollections = successfulPayments.reduce(
      (s, p) => s + (p.numericAmount || 0),
      0,
    );

    const completedRefunds = refunds
      .filter((r) => r.refundStatus === 'Completed')
      .reduce((s, r) => s + (r.refundAmount || 0), 0);

    const netCollections = totalCollections - completedRefunds;

    const outstandingPayments = activeBookings.reduce((s, b) => {
      if (b.outstandingBalance !== undefined) {
        return s + Math.max(0, b.outstandingBalance);
      }
      const total = this.parseAmount(b.totalAmount ?? b.amount);
      const paid = b.amountPaid ?? this.parseAmount(b.advance);
      return s + Math.max(0, total - paid);
    }, 0);

    return {
      totalBookingValue: Math.round(totalBookingValue),
      totalCollections: Math.round(totalCollections),
      completedRefunds: Math.round(completedRefunds),
      netCollections: Math.round(netCollections),
      outstandingPayments: Math.round(outstandingPayments),
    };
  });

  readonly dashboardKpis = computed(() => {
    const bookings = this.scopedBookings();
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(
      (b) =>
        b.status === 'Confirmed' ||
        b.status === 'Checked-In' ||
        b.status === 'Checked-Out' ||
        b.status === 'Paid',
    ).length;
    const cancelledBookings = bookings.filter((b) => b.status === 'Cancelled').length;
    const cancellationRate =
      totalBookings > 0
        ? Math.round((cancelledBookings / totalBookings) * 1000) / 10
        : 0;

    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      cancellationRate,
      occupancyRate: this.occupancyMetrics().occupancyRate,
      ...this.financialMetrics(),
    };
  });

  // --- Filter Helpers ---
  setPreset(preset: DatePreset): void {
    const curr = this.filter();
    if (preset === 'custom') {
      this.filter.set({ ...curr, preset: 'custom' });
      return;
    }
    this.filter.set(this.buildPresetState(preset, curr.lodgeId));
  }

  setCustomDates(startDate: string, endDate: string): void {
    const curr = this.filter();
    this.filter.set({ ...curr, preset: 'custom', startDate, endDate });
  }

  setLodge(lodgeId: string): void {
    const curr = this.filter();
    this.filter.set({ ...curr, lodgeId });
  }

  private buildPresetState(preset: DatePreset, lodgeId: string): ReportFilterState {
    const today = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let start = new Date(today);
    let end = new Date(today);

    if (preset === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end = new Date(start);
    } else if (preset === 'last7') {
      start.setDate(today.getDate() - 6);
    } else if (preset === 'last30') {
      start.setDate(today.getDate() - 29);
    } else if (preset === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset === 'thisYear') {
      start = new Date(today.getFullYear(), 0, 1);
    }

    return {
      preset,
      startDate: fmt(start),
      endDate: fmt(end),
      lodgeId,
    };
  }

  parseAmount(val: string | number | undefined): number {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // --- CSV & PDF Export ---
  exportCsv(meta: ExportMeta): void {
    if (!this.canExportReports()) return;
    const generatedAt = new Date().toISOString();
    const lines = [
      ['Report', meta.reportName],
      ['Lodge', meta.lodgeLabel],
      ['Date Range', `${meta.startDate} to ${meta.endDate}`],
      ['Generated At', generatedAt],
      [],
      meta.headers,
      ...meta.rows,
    ];

    const csv = lines
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.reportName.toLowerCase().replace(/\s+/g, '-')}-${meta.startDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(meta: ExportMeta): void {
    if (!this.canExportReports()) return;
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) return;

    const headCells = meta.headers.map((h) => `<th>${this.escapeHtml(h)}</th>`).join('');
    const bodyRows = meta.rows
      .map(
        (r) =>
          `<tr>${r.map((c) => `<td>${this.escapeHtml(String(c))}</td>`).join('')}</tr>`,
      )
      .join('');

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${this.escapeHtml(meta.reportName)}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; font-size: 20px; }
            .meta { font-size: 12px; color: #475569; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${this.escapeHtml(meta.reportName)}</h1>
          <div class="meta">
            Lodge: ${this.escapeHtml(meta.lodgeLabel)} |
            Period: ${this.escapeHtml(meta.startDate)} to ${this.escapeHtml(meta.endDate)} |
            Generated: ${new Date().toLocaleString()}
          </div>
          <table>
            <thead><tr>${headCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
