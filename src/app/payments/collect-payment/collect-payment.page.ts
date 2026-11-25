import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, cardOutline, checkmarkCircleOutline } from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  ExtendedBookingItem,
  PaymentMethod,
  PaymentType,
} from '../../interface';
import { BillingService } from '../../services/billing.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-collect-payment',
  templateUrl: './collect-payment.page.html',
  styleUrls: ['./collect-payment.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonSpinner, AppShellComponent],
})
export class CollectPaymentPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly billingService = inject(BillingService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly bookings = computed(() =>
    this.lodgeData.bookings().filter((b) => b.status !== 'Cancelled'),
  );

  readonly selectedBookingId = signal('');
  readonly selectedBooking = computed<ExtendedBookingItem | undefined>(() =>
    this.bookings().find((b) => b.id === this.selectedBookingId()),
  );
  readonly ledger = computed(() => {
    const b = this.selectedBooking();
    return b ? this.billingService.computeBookingLedger(b) : null;
  });

  paymentAmount = 0;
  paymentType: PaymentType = 'Full';
  paymentMethod: PaymentMethod = 'UPI';
  referenceNumber = '';
  paymentDate = new Date().toISOString().slice(0, 10);
  notes = '';
  readonly isSubmitting = signal(false);
  private sessionIdempKey = `IDEMP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  constructor() {
    addIcons({ arrowBackOutline, cardOutline, checkmarkCircleOutline });
  }

  ngOnInit(): void {
    const qId = this.route.snapshot.queryParamMap.get('bookingId');
    if (qId) {
      this.onBookingSelect(qId);
    } else if (this.bookings().length > 0) {
      this.onBookingSelect(this.bookings()[0].id);
    }
  }

  onBookingSelect(bookingId: string): void {
    this.selectedBookingId.set(bookingId);
    this.sessionIdempKey = `IDEMP-${bookingId}-${Date.now()}`;
    const b = this.bookings().find((x) => x.id === bookingId);
    if (b) {
      const l = this.billingService.computeBookingLedger(b);
      this.paymentAmount = l.outstandingBalance;
      this.paymentType = l.netPaidAmount > 0 ? 'Remaining Balance' : 'Full';
    }
  }

  async submitPayment(): Promise<void> {
    if (this.isSubmitting()) return;
    const b = this.selectedBooking();
    if (!b) {
      this.toast.warning('Please select a booking.');
      return;
    }
    if (!this.paymentAmount || this.paymentAmount <= 0) {
      this.toast.error('Payment amount must be greater than zero.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const pid = await this.billingService.collectPayment({
        propertyId: b.propertyId || 'lodge_001',
        bookingId: b.id,
        customerId: b.customerId,
        guestName: b.guestName,
        guestPhone: b.guestPhone,
        amount: Number(this.paymentAmount),
        method: this.paymentMethod,
        type: this.paymentType,
        referenceNumber: this.referenceNumber.trim() || undefined,
        paymentDate: this.paymentDate,
        idempotencyKey: this.sessionIdempKey,
        notes: this.notes.trim() || undefined,
      });

      this.toast.success(
        this.paymentMethod === 'Online Gateway'
          ? `Payment ${pid} initiated (pending gateway verification).`
          : `Payment ${pid} recorded successfully.`,
      );
      void this.router.navigate(['/payments/transactions']);
    } catch (err: any) {
      this.toast.error(err?.message || 'Payment collection failed.');
    } finally {
      this.isSubmitting.set(false);
    }
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
    const target =
      role === 'owner'
        ? '/owner/dashboard'
        : role === 'manager'
          ? '/manager/dashboard'
          : '/staff/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
