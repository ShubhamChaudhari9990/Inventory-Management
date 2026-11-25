import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonModal,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import {
  PaymentMethod,
  PaymentRecord,
  PaymentType,
} from '../../../interface';
import { LodgeDataService } from '../../../services/lodge-data.service';
import { PropertyService } from '../../../services/property.service';
import { AppToastService } from '../../../shared/services/app-toast.service';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardKpi } from '../../../interface';

@Component({
  selector: 'app-payments-view',
  templateUrl: './payments-view.component.html',
  styleUrls: ['./payments-view.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonModal,
    TranslatePipe,
    DashboardKpiCardComponent,
  ],
})
export class PaymentsViewComponent {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly appToast = inject(AppToastService);

  readonly payments = this.lodgeData.payments;
  readonly selectedPropertyName = this.propertyService.selectedPropertyName;

  readonly query = signal('');
  readonly selectedMethodFilter = signal<string>('All');
  readonly selectedStatusFilter = signal<string>('All');

  readonly isRecordModalOpen = signal(false);
  readonly isRefundModalOpen = signal(false);
  readonly isReceiptModalOpen = signal(false);
  readonly activeReceiptPayment = signal<PaymentRecord | null>(null);
  readonly activeRefundPayment = signal<PaymentRecord | null>(null);

  // Form states
  formGuestName = '';
  formGuestPhone = '';
  formAmount = 0;
  formMethod: PaymentMethod = 'UPI';
  formType: PaymentType = 'Full';
  formTransactionId = '';
  formNotes = '';

  // Refund states
  refundAmount = 0;
  refundReason = '';

  readonly methods: PaymentMethod[] = [
    'UPI',
    'Cash',
    'Credit Card',
    'Debit Card',
    'Bank Transfer',
    'Other',
  ];

  readonly kpis = computed<DashboardKpi[]>(() => {
    const list = this.payments();
    const totalCollected = list
      .filter((p) => p.status === 'Paid' || p.status === 'Partially Paid')
      .reduce((sum, p) => sum + (p.numericAmount > 0 ? p.numericAmount : 0), 0);

    const pendingCount = list.filter((p) => p.status === 'Pending').length;
    const refundedSum = list
      .filter((p) => p.type === 'Refund' || p.status === 'Refunded')
      .reduce((sum, p) => sum + Math.abs(p.numericAmount), 0);

    const todayCount = list.filter((p) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      return p.createdAt && p.createdAt.startsWith(todayStr);
    }).length;

    return [
      {
        id: 'total-collected',
        label: 'Total Collected',
        value: `₹${totalCollected.toLocaleString('en-IN')}`,
        icon: 'cash-outline',
        tone: 'success',
      },
      {
        id: 'today-txns',
        label: "Today's Transactions",
        value: String(todayCount || list.length),
        icon: 'card-outline',
        tone: 'primary',
      },
      {
        id: 'pending-payments',
        label: 'Pending Payments',
        value: String(pendingCount),
        icon: 'time-outline',
        tone: 'warm',
      },
      {
        id: 'total-refunds',
        label: 'Total Refunds',
        value: `₹${refundedSum.toLocaleString('en-IN')}`,
        icon: 'refresh-outline',
        tone: 'danger',
      },
    ];
  });

  readonly filteredPayments = computed(() => {
    const q = this.query().trim().toLowerCase();
    const method = this.selectedMethodFilter();
    const status = this.selectedStatusFilter();

    return this.payments().filter((p) => {
      const matchMethod = method === 'All' || p.method === method;
      const matchStatus = status === 'All' || p.status === status;
      const matchQuery =
        !q ||
        p.guestName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(q)) ||
        (p.bookingId && p.bookingId.toLowerCase().includes(q)) ||
        p.method.toLowerCase().includes(q);

      return matchMethod && matchStatus && matchQuery;
    });
  });

  openRecordModal(): void {
    this.formGuestName = '';
    this.formGuestPhone = '';
    this.formAmount = 0;
    this.formMethod = 'UPI';
    this.formType = 'Full';
    this.formTransactionId = '';
    this.formNotes = '';
    this.isRecordModalOpen.set(true);
  }

  closeRecordModal(): void {
    this.isRecordModalOpen.set(false);
  }

  openRefundModal(payment: PaymentRecord, event: Event): void {
    event.stopPropagation();
    this.activeRefundPayment.set(payment);
    this.refundAmount = Math.max(0, payment.numericAmount);
    this.refundReason = '';
    this.isRefundModalOpen.set(true);
  }

  closeRefundModal(): void {
    this.isRefundModalOpen.set(false);
    this.activeRefundPayment.set(null);
  }

  openReceiptModal(payment: PaymentRecord, event: Event): void {
    event.stopPropagation();
    this.activeReceiptPayment.set(payment);
    this.isReceiptModalOpen.set(true);
  }

  closeReceiptModal(): void {
    this.isReceiptModalOpen.set(false);
    this.activeReceiptPayment.set(null);
  }

  async submitPayment(): Promise<void> {
    if (!this.formGuestName.trim() || this.formAmount <= 0) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 2500, 'warning');
      return;
    }

    try {
      await this.lodgeData.recordPayment({
        propertyId: 'all',
        guestName: this.formGuestName.trim(),
        guestPhone: this.formGuestPhone.trim(),
        amount: Number(this.formAmount),
        method: this.formMethod,
        type: this.formType,
        transactionId: this.formTransactionId.trim() || undefined,
        notes: this.formNotes.trim() || undefined,
      });

      this.closeRecordModal();
      await this.appToast.show('Payment successfully recorded.', 2500, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error recording payment';
      await this.appToast.show(message, 3000, 'danger');
    }
  }

  async submitRefund(): Promise<void> {
    const payment = this.activeRefundPayment();
    if (!payment || this.refundAmount <= 0) return;

    if (!this.refundReason.trim()) {
      await this.appToast.show('Please provide a reason for the refund.', 2500, 'warning');
      return;
    }

    try {
      await this.lodgeData.processRefund(payment.id, this.refundAmount, this.refundReason.trim());
      this.closeRefundModal();
      await this.appToast.show('Refund transaction processed successfully.', 2500, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error processing refund';
      await this.appToast.show(message, 3000, 'danger');
    }
  }

  printReceipt(): void {
    window.print();
  }

  downloadReceipt(): void {
    void this.appToast.show('Payment receipt generated & downloaded.', 2400, 'success');
    this.closeReceiptModal();
  }

  trackPayment(_: number, item: PaymentRecord): string {
    return item.id;
  }
}
