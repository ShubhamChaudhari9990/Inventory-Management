import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  BookingLedgerSummary,
  ExtendedBookingItem,
  InvoiceRecord,
  PaymentFormData,
  PaymentRecord,
  PaymentStatus,
  RefundRecord,
} from '../interface';
import { FirebaseService } from './firebase.service';
import { LodgeDataService } from './lodge-data.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

@Injectable({
  providedIn: 'root',
})
export class BillingService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  private unsubRefunds: (() => void) | null = null;
  private unsubInvoices: (() => void) | null = null;

  private readonly rawRefunds = signal<RefundRecord[]>([]);
  private readonly rawInvoices = signal<InvoiceRecord[]>([]);

  readonly payments = this.lodgeData.payments;
  readonly allPayments = this.lodgeData.allPayments;

  readonly refunds = computed<RefundRecord[]>(() => {
    const selProp = this.propertyService.selectedPropertyId();
    return this.rawRefunds()
      .filter((r) => {
        if (!this.roleService.canAccessProperty(r.propertyId)) return false;
        if (selProp !== 'all' && r.propertyId !== selProp) return false;
        return true;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  });

  readonly invoices = computed<InvoiceRecord[]>(() => {
    const selProp = this.propertyService.selectedPropertyId();
    return this.rawInvoices()
      .filter((inv) => {
        if (!this.roleService.canAccessProperty(inv.propertyId)) return false;
        if (selProp !== 'all' && inv.propertyId !== selProp) return false;
        return true;
      })
      .sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));
  });

  constructor() {
    this.firebaseService.currentUser$.subscribe((user) => {
      if (user) {
        this.startListeners();
      } else {
        this.stopListeners();
      }
    });
  }

  private startListeners(): void {
    const db = this.firebaseService.dbInstance;
    if (!this.unsubRefunds) {
      this.unsubRefunds = onSnapshot(
        collection(db, 'refunds'),
        (snap) => {
          const items = snap.docs.map((d) => ({ ...(d.data() as RefundRecord), id: d.id }));
          this.ngZone.run(() => this.rawRefunds.set(items));
        },
        (err) => console.warn('Refunds listener error:', err.message),
      );
    }
    if (!this.unsubInvoices) {
      this.unsubInvoices = onSnapshot(
        collection(db, 'invoices'),
        (snap) => {
          const items = snap.docs.map((d) => ({ ...(d.data() as InvoiceRecord), id: d.id }));
          this.ngZone.run(() => this.rawInvoices.set(items));
        },
        (err) => console.warn('Invoices listener error:', err.message),
      );
    }
  }

  private stopListeners(): void {
    try { this.unsubRefunds?.(); } catch {}
    try { this.unsubInvoices?.(); } catch {}
    this.unsubRefunds = null;
    this.unsubInvoices = null;
  }

  // ==========================================
  // UNIFIED LEDGER CALCULATION (SOURCE OF TRUTH)
  // ==========================================

  parseCurrency(val?: string | number): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return Number(String(val).replace(/[^0-9.-]/g, '')) || 0;
  }

  computeBookingLedger(booking: ExtendedBookingItem): BookingLedgerSummary {
    const bookingTotal = booking.totalAmount ?? this.parseCurrency(booking.amount);
    const payments = this.allPayments().filter((p) => p.bookingId === booking.id);
    const refunds = this.rawRefunds().filter((r) => r.bookingId === booking.id);

    const totalSuccessfulPayments = payments
      .filter((p) => p.status === 'Paid' && p.type !== 'Refund')
      .reduce((sum, p) => sum + (Number(p.numericAmount) || this.parseCurrency(p.amount)), 0);

    const completedRefunds = refunds
      .filter((r) => r.refundStatus === 'Completed')
      .reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);

    const pendingRefunds = refunds
      .filter((r) => ['Requested', 'Approved', 'Processing'].includes(r.refundStatus))
      .reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);

    const netPaidAmount = Math.max(0, totalSuccessfulPayments - completedRefunds);
    const outstandingBalance = Math.max(0, bookingTotal - netPaidAmount);

    let paymentStatus: PaymentStatus = 'Unpaid';
    if (pendingRefunds > 0) {
      paymentStatus = 'Refund Pending';
    } else if (completedRefunds > 0 && netPaidAmount === 0) {
      paymentStatus = 'Refunded';
    } else if (completedRefunds > 0 && netPaidAmount > 0) {
      paymentStatus = 'Partially Refunded';
    } else if (netPaidAmount > bookingTotal && bookingTotal > 0) {
      paymentStatus = 'Overpaid';
    } else if (netPaidAmount >= bookingTotal && bookingTotal > 0) {
      paymentStatus = 'Paid';
    } else if (netPaidAmount > 0) {
      paymentStatus = 'Partially Paid';
    }

    return {
      bookingId: booking.id,
      bookingTotal,
      totalSuccessfulPayments,
      completedRefunds,
      pendingRefunds,
      netPaidAmount,
      outstandingBalance,
      paymentStatus,
      payments,
      refunds,
    };
  }

  // ==========================================
  // TRANSACTION-SAFE PAYMENT COLLECTION
  // ==========================================

  async collectPayment(data: PaymentFormData): Promise<string> {
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }
    if (!this.roleService.canAccessProperty(data.propertyId)) {
      throw new Error('Unauthorized lodge access for payment collection.');
    }

    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();
    const paymentId = `PAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const idempKey =
      data.idempotencyKey ||
      `${data.bookingId || 'DIRECT'}_${Math.round(data.amount)}_${Date.now()}`;
    const property = this.propertyService
      .properties()
      .find((p) => p.id === data.propertyId);

    const isGateway = data.method === 'Online Gateway';
    const paymentStatus: PaymentStatus = isGateway ? 'Pending' : 'Paid';

    await runTransaction(db, async (tx) => {
      const idempRef = doc(db, 'idempotencyKeys', idempKey);
      const idempSnap = await tx.get(idempRef);
      if (idempSnap.exists()) {
        throw new Error('Duplicate payment submission detected and prevented.');
      }

      if (data.bookingId) {
        const bookingRef = doc(db, 'bookings', data.bookingId);
        const bookingSnap = await tx.get(bookingRef);
        if (!bookingSnap.exists()) {
          throw new Error(`Booking ${data.bookingId} not found.`);
        }
        const bData = bookingSnap.data() as ExtendedBookingItem;
        const ledger = this.computeBookingLedger(bData);
        if (!isGateway && data.amount > ledger.outstandingBalance + 0.01) {
          throw new Error(
            `Payment ₹${data.amount} exceeds outstanding balance ₹${ledger.outstandingBalance}.`,
          );
        }

        const nextPaid = isGateway
          ? ledger.netPaidAmount
          : ledger.netPaidAmount + data.amount;
        const nextOutstanding = Math.max(0, ledger.bookingTotal - nextPaid);
        const nextStatus =
          nextOutstanding === 0
            ? 'Paid'
            : nextPaid > 0
              ? 'Partially Paid'
              : 'Pending';

        tx.update(bookingRef, {
          amountPaid: nextPaid,
          outstandingBalance: nextOutstanding,
          paymentStatus: nextStatus,
          updatedAt: now,
        });
      }

      const paymentDoc: PaymentRecord = {
        id: paymentId,
        organizationId: orgId,
        propertyId: data.propertyId,
        propertyName: property?.name || 'LemonWood Heritage',
        bookingId: data.bookingId,
        customerId: data.customerId,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        amount: `₹${data.amount.toLocaleString('en-IN')}`,
        numericAmount: data.amount,
        currency: 'INR',
        method: data.method,
        status: paymentStatus,
        type: data.type,
        transactionId: data.transactionId || paymentId,
        referenceNumber: data.referenceNumber,
        idempotencyKey: idempKey,
        isManual: !isGateway,
        paymentDate: data.paymentDate || now.slice(0, 10),
        notes: data.notes || (isGateway ? 'Pending gateway verification' : 'Manually recorded payment'),
        createdById: user?.uid || '',
        createdByName: user?.name || user?.email || 'Staff',
        createdAt: now,
        updatedAt: now,
        auditTrail: [
          {
            timestamp: now,
            action: 'Created',
            performedBy: user?.name || user?.email || 'Staff',
            reason: isGateway ? 'Initiated online payment' : 'Manual payment collected',
          },
        ],
      };

      tx.set(idempRef, { key: idempKey, paymentId, createdAt: now });
      tx.set(doc(db, 'payments', paymentId), this.stripUndefined(paymentDoc));
    });

    return paymentId;
  }

  // ==========================================
  // REFUND WORKFLOW
  // ==========================================

  async requestRefund(params: {
    booking: ExtendedBookingItem;
    payment: PaymentRecord;
    refundAmount: number;
    reason: string;
  }): Promise<string> {
    if (params.refundAmount <= 0) {
      throw new Error('Refund amount must be greater than zero.');
    }
    const existingRefunded = this.rawRefunds()
      .filter(
        (r) =>
          r.paymentId === params.payment.id &&
          !['Rejected', 'Failed'].includes(r.refundStatus),
      )
      .reduce((s, r) => s + r.refundAmount, 0);

    const maxRefundable = params.payment.numericAmount - existingRefunded;
    if (params.refundAmount > maxRefundable) {
      throw new Error(
        `Refund ₹${params.refundAmount} exceeds refundable amount ₹${maxRefundable}.`,
      );
    }

    const user = this.roleService.currentUserProfile();
    if (!user) throw new Error('Authentication required.');
    const refundId = `REF-${Date.now()}`;
    const now = new Date().toISOString();

    const record: RefundRecord = {
      id: refundId,
      organizationId: this.roleService.currentOrganizationId(),
      propertyId: params.payment.propertyId,
      propertyName: params.payment.propertyName,
      bookingId: params.booking.id,
      paymentId: params.payment.id,
      customerId: params.booking.customerId,
      guestName: params.booking.guestName,
      refundAmount: params.refundAmount,
      refundReason: params.reason.trim(),
      refundStatus: 'Requested',
      requestedBy: user.name || user.email || 'User',
      requestedByUid: user.uid,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(
      doc(this.firebaseService.dbInstance, 'refunds', refundId),
      this.stripUndefined(record),
    );
    return refundId;
  }

  async approveRefund(refundId: string): Promise<void> {
    if (!this.roleService.isOwner() && !this.roleService.isManager()) {
      throw new Error('Only Owner or authorized Manager can approve refunds.');
    }
    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    await updateDoc(doc(this.firebaseService.dbInstance, 'refunds', refundId), {
      refundStatus: 'Approved',
      approvedBy: user?.name || user?.email || 'Owner',
      approvedAt: now,
      updatedAt: now,
    });
  }

  async rejectRefund(refundId: string): Promise<void> {
    if (!this.roleService.isOwner() && !this.roleService.isManager()) {
      throw new Error('Only Owner or Manager can reject refunds.');
    }
    await updateDoc(doc(this.firebaseService.dbInstance, 'refunds', refundId), {
      refundStatus: 'Rejected',
      updatedAt: new Date().toISOString(),
    });
  }

  async completeRefund(refund: RefundRecord, refundReference: string): Promise<void> {
    if (!this.roleService.isOwner() && !this.roleService.isManager()) {
      throw new Error('Unauthorized to complete refund.');
    }
    if (!refundReference.trim()) {
      throw new Error('Refund transaction reference is required.');
    }
    const db = this.firebaseService.dbInstance;
    const now = new Date().toISOString();

    await runTransaction(db, async (tx) => {
      const refDoc = doc(db, 'refunds', refund.id);
      const snap = await tx.get(refDoc);
      if (!snap.exists()) throw new Error('Refund record not found.');
      if (snap.data()?.['refundStatus'] === 'Completed') {
        throw new Error('Refund is already completed.');
      }

      tx.update(refDoc, {
        refundStatus: 'Completed',
        refundReference: refundReference.trim(),
        completedAt: now,
        updatedAt: now,
      });

      const bookingRef = doc(db, 'bookings', refund.bookingId);
      const bSnap = await tx.get(bookingRef);
      if (bSnap.exists()) {
        const bData = bSnap.data() as ExtendedBookingItem;
        const ledger = this.computeBookingLedger(bData);
        const nextPaid = Math.max(0, ledger.netPaidAmount - refund.refundAmount);
        const nextOut = Math.max(0, ledger.bookingTotal - nextPaid);
        tx.update(bookingRef, {
          amountPaid: nextPaid,
          outstandingBalance: nextOut,
          paymentStatus: nextPaid === 0 ? 'Refunded' : 'Partially Paid',
          updatedAt: now,
        });
      }
    });
  }

  // ==========================================
  // SNAPSHOT INVOICE GENERATION
  // ==========================================

  async generateInvoiceForBooking(booking: ExtendedBookingItem): Promise<string> {
    const existing = this.rawInvoices().find((i) => i.bookingId === booking.id);
    if (existing) return existing.id;

    const lodge = this.propertyService
      .properties()
      .find((p) => p.id === (booking.propertyId || '')) as any;
    const ledger = this.computeBookingLedger(booking);
    const taxRate = lodge?.taxSettings?.defaultTaxRate ?? 12;
    const isGst = !!(lodge?.taxSettings?.gstNumber || lodge?.gstin);
    const totalAmount = ledger.bookingTotal;
    const taxAmount = isGst
      ? Math.round(totalAmount - totalAmount / (1 + taxRate / 100))
      : 0;
    const roomCharges = totalAmount - taxAmount;

    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    const invId = `INV-${Date.now()}`;
    const prefix = lodge?.taxSettings?.invoicePrefix || lodge?.code || 'LW';
    const invNum = `${prefix}-${String(Date.now()).slice(-5)}`;

    const record: InvoiceRecord = {
      id: invId,
      invoiceNumber: invNum,
      organizationId: this.roleService.currentOrganizationId(),
      propertyId: booking.propertyId || lodge?.id || 'lodge_001',
      businessName: lodge?.businessName || 'LemonWood Hospitality',
      lodgeName: lodge?.name || booking.propertyName || 'LemonWood Lodge',
      lodgeAddress: [lodge?.address, lodge?.city, lodge?.state].filter(Boolean).join(', ') || 'India',
      lodgeGst: lodge?.taxSettings?.gstNumber || lodge?.gstin || undefined,
      customerId: booking.customerId,
      customerName: booking.guestName,
      customerPhone: booking.guestPhone,
      customerEmail: booking.guestEmail,
      bookingId: booking.id,
      roomNumber: booking.room,
      roomType: booking.roomType,
      checkInDate: booking.checkIn,
      checkOutDate: booking.checkOut,
      roomCharges,
      additionalServices: booking.additionalCharges || 0,
      discounts: booking.discounts || 0,
      taxRate: isGst ? taxRate : 0,
      taxAmount,
      totalAmount,
      amountPaid: ledger.netPaidAmount,
      outstandingBalance: ledger.outstandingBalance,
      currency: lodge?.currency || 'INR',
      paymentHistorySnapshot: ledger.payments.map((p) => ({
        id: p.id,
        amount: p.numericAmount,
        method: p.method,
        date: p.paymentDate || p.createdAt.slice(0, 10),
        status: p.status,
      })),
      issuedAt: now,
      issuedBy: user?.name || user?.email || 'System',
    };

    await setDoc(
      doc(this.firebaseService.dbInstance, 'invoices', invId),
      this.stripUndefined(record),
    );
    return invId;
  }

  private stripUndefined<T extends Record<string, any>>(obj: T): T {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = this.stripUndefined(v);
      } else {
        out[k] = v;
      }
    }
    return out as T;
  }
}
