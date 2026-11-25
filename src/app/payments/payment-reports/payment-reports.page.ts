import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, downloadOutline } from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { BillingService } from '../../services/billing.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

export type FinancialReportType =
  | 'daily'
  | 'monthly'
  | 'lodge'
  | 'method'
  | 'pending'
  | 'refund'
  | 'booking'
  | 'tax';

@Component({
  selector: 'app-payment-reports',
  templateUrl: './payment-reports.page.html',
  styleUrls: ['./payment-reports.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class PaymentReportsPage {
  private readonly router = inject(Router);
  private readonly billingService = inject(BillingService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly reportType = signal<FinancialReportType>('daily');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly methodFilter = signal('all');
  readonly statusFilter = signal('all');

  readonly payments = this.billingService.payments;
  readonly refunds = this.billingService.refunds;
  readonly invoices = this.billingService.invoices;
  readonly bookings = this.lodgeData.bookings;
  readonly lodges = this.propertyService.accessibleProperties;

  readonly filteredPayments = computed(() => {
    const sd = this.startDate();
    const ed = this.endDate();
    const m = this.methodFilter();
    const st = this.statusFilter();

    return this.payments().filter((p) => {
      const d = p.paymentDate || p.createdAt.slice(0, 10);
      if (sd && d < sd) return false;
      if (ed && d > ed) return false;
      if (m !== 'all' && p.method !== m) return false;
      if (st !== 'all' && p.status !== st) return false;
      return true;
    });
  });

  readonly reportRows = computed<{ label: string; count: number; total: number }[]>(() => {
    const type = this.reportType();
    const payList = this.filteredPayments().filter((p) => p.status === 'Paid');

    if (type === 'daily' || type === 'monthly') {
      const map = new Map<string, { count: number; total: number }>();
      for (const p of payList) {
        const key = (p.paymentDate || p.createdAt).slice(0, type === 'daily' ? 10 : 7);
        const cur = map.get(key) || { count: 0, total: 0 };
        cur.count++;
        cur.total += Number(p.numericAmount) || 0;
        map.set(key, cur);
      }
      return Array.from(map.entries()).map(([label, v]) => ({ label, ...v }));
    }

    if (type === 'lodge') {
      const map = new Map<string, { count: number; total: number }>();
      for (const p of payList) {
        const key = p.propertyName || p.propertyId;
        const cur = map.get(key) || { count: 0, total: 0 };
        cur.count++;
        cur.total += Number(p.numericAmount) || 0;
        map.set(key, cur);
      }
      return Array.from(map.entries()).map(([label, v]) => ({ label, ...v }));
    }

    if (type === 'method') {
      const map = new Map<string, { count: number; total: number }>();
      for (const p of payList) {
        const cur = map.get(p.method) || { count: 0, total: 0 };
        cur.count++;
        cur.total += Number(p.numericAmount) || 0;
        map.set(p.method, cur);
      }
      return Array.from(map.entries()).map(([label, v]) => ({ label, ...v }));
    }

    if (type === 'pending') {
      return this.bookings()
        .filter((b) => b.status !== 'Cancelled')
        .map((b) => ({
          label: `${b.id} · ${b.guestName}`,
          count: 1,
          total: this.billingService.computeBookingLedger(b).outstandingBalance,
        }))
        .filter((x) => x.total > 0);
    }

    if (type === 'refund') {
      return this.refunds().map((r) => ({
        label: `${r.id} · ${r.guestName} (${r.refundStatus})`,
        count: 1,
        total: r.refundAmount,
      }));
    }

    if (type === 'tax') {
      return this.invoices().map((i) => ({
        label: `${i.invoiceNumber} · ${i.customerName} (${i.taxRate}% GST)`,
        count: 1,
        total: i.taxAmount,
      }));
    }

    return this.bookings().map((b) => ({
      label: `${b.id} · ${b.guestName}`,
      count: 1,
      total: this.billingService.computeBookingLedger(b).netPaidAmount,
    }));
  });

  constructor() {
    addIcons({ arrowBackOutline, downloadOutline });
  }

  exportCsv(): void {
    const rows = this.reportRows();
    const lines = [['Category / Item', 'Count', 'Amount (INR)'].join(',')];
    for (const r of rows) {
      lines.push(`"${r.label.replace(/"/g, '""')}",${r.count},${r.total}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LemonWood_${this.reportType()}_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('CSV report exported.');
  }

  goBack(): void {
    void this.router.navigate(['/payments']);
  }

  onNavChange(navId: string): void {
    if (navId === 'payments') {
      this.goBack();
      return;
    }
    const role = this.roleService.currentRole();
    const target = role === 'owner' ? '/owner/dashboard' : '/manager/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
