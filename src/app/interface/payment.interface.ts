export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Card'
  | 'Credit Card'
  | 'Debit Card'
  | 'Bank Transfer'
  | 'Online Gateway'
  | 'Other';

export type PaymentStatus =
  | 'Unpaid'
  | 'Pending'
  | 'Partially Paid'
  | 'Paid'
  | 'Overpaid'
  | 'Failed'
  | 'Refund Pending'
  | 'Partially Refunded'
  | 'Refunded';

export type PaymentType =
  | 'Full'
  | 'Partial'
  | 'Advance'
  | 'Remaining Balance'
  | 'Additional Charges'
  | 'Refund'
  | 'Adjustment';

export type RefundStatus =
  | 'Requested'
  | 'Approved'
  | 'Processing'
  | 'Completed'
  | 'Rejected'
  | 'Failed';

export interface PaymentAuditEntry {
  timestamp: string;
  action: 'Created' | 'Updated' | 'Refunded' | 'Adjusted';
  performedBy: string;
  reason?: string;
  previousValues?: Record<string, unknown>;
}

export interface PaymentRecord {
  id: string;
  organizationId?: string;
  propertyId: string;
  propertyName?: string;
  bookingId?: string;
  customerId?: string;
  guestName: string;
  guestPhone?: string;
  amount: string;
  numericAmount: number;
  currency?: string;
  method: PaymentMethod;
  status: PaymentStatus;
  type: PaymentType;
  transactionId?: string;
  referenceNumber?: string;
  gatewayReference?: string;
  idempotencyKey?: string;
  isManual?: boolean;
  paymentDate?: string;
  receiptNumber?: string;
  invoiceNumber?: string;
  refundedAmount?: number;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  auditTrail?: PaymentAuditEntry[];
}

export interface PaymentFormData {
  propertyId: string;
  bookingId?: string;
  customerId?: string;
  guestName: string;
  guestPhone?: string;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  transactionId?: string;
  referenceNumber?: string;
  paymentDate?: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface RefundRecord {
  id: string;
  organizationId: string;
  propertyId: string;
  propertyName?: string;
  bookingId: string;
  paymentId: string;
  customerId?: string;
  guestName: string;
  refundAmount: number;
  refundReason: string;
  refundStatus: RefundStatus;
  refundReference?: string;
  requestedBy: string;
  requestedByUid: string;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  propertyId: string;
  businessName: string;
  lodgeName: string;
  lodgeAddress: string;
  lodgeGst?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  bookingId: string;
  roomNumber: string;
  roomType?: string;
  checkInDate: string;
  checkOutDate: string;
  roomCharges: number;
  additionalServices: number;
  discounts: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  currency: string;
  paymentHistorySnapshot: {
    id: string;
    amount: number;
    method: string;
    date: string;
    status: string;
  }[];
  issuedAt: string;
  issuedBy: string;
}

export interface BookingLedgerSummary {
  bookingId: string;
  bookingTotal: number;
  totalSuccessfulPayments: number;
  completedRefunds: number;
  pendingRefunds: number;
  netPaidAmount: number;
  outstandingBalance: number;
  paymentStatus: PaymentStatus;
  payments: PaymentRecord[];
  refunds: RefundRecord[];
}
