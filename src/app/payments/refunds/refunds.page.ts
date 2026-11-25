import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmarkOutline, closeOutline } from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { RefundRecord } from '../../interface';
import { BillingService } from '../../services/billing.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-refunds',
  templateUrl: './refunds.page.html',
  styleUrls: ['./refunds.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class RefundsPage {
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly billingService = inject(BillingService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly refunds = this.billingService.refunds;
  readonly bookings = this.lodgeData.bookings;
  readonly isOwner = this.roleService.isOwner;
  readonly isManager = this.roleService.isManager;

  readonly selectedBookingId = signal('');
  readonly bookingPayments = computed(() =>
    this.billingService
      .payments()
      .filter((p) => p.bookingId === this.selectedBookingId() && p.status === 'Paid'),
  );
  selectedPaymentId = '';
  refundAmount = 0;
  refundReason = '';

  constructor() {
    addIcons({ arrowBackOutline, checkmarkOutline, closeOutline });
  }

  onBookingChange(id: string): void {
    this.selectedBookingId.set(id);
    const first = this.bookingPayments()[0];
    this.selectedPaymentId = first?.id || '';
    this.refundAmount = first?.numericAmount || 0;
  }

  async submitRequest(): Promise<void> {
    const booking = this.bookings().find((b) => b.id === this.selectedBookingId());
    const payment = this.bookingPayments().find((p) => p.id === this.selectedPaymentId);
    if (!booking || !payment) {
      this.toast.warning('Select a booking and original payment.');
      return;
    }
    if (!this.refundReason.trim()) {
      this.toast.warning('Enter a reason for the refund.');
      return;
    }
    try {
      await this.billingService.requestRefund({
        booking,
        payment,
        refundAmount: Number(this.refundAmount),
        reason: this.refundReason,
      });
      this.refundReason = '';
      this.toast.success('Refund request submitted for approval.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to submit refund request.');
    }
  }

  async approve(r: RefundRecord): Promise<void> {
    try {
      await this.billingService.approveRefund(r.id);
      this.toast.success('Refund approved.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Approval failed.');
    }
  }

  async reject(r: RefundRecord): Promise<void> {
    try {
      await this.billingService.rejectRefund(r.id);
      this.toast.success('Refund rejected.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Rejection failed.');
    }
  }

  async complete(r: RefundRecord): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Refund Completion',
      message: `Enter the payout / bank / cash reference for ₹${r.refundAmount}.`,
      inputs: [{ name: 'ref', type: 'text', placeholder: 'Refund Reference Number' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Mark Completed',
          handler: async (data) => {
            try {
              await this.billingService.completeRefund(r, data?.ref || '');
              this.toast.success('Refund marked as completed.');
            } catch (err: any) {
              this.toast.error(err?.message || 'Completion failed.');
            }
          },
        },
      ],
    });
    await alert.present();
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
