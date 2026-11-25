export type BookingChannel = 'All' | 'Walk-in' | 'Advance' | 'Online' | 'Phone' | 'Corporate';
export type BookingStatus = 'Pending' | 'Confirmed' | 'Checked-In' | 'Checked-Out' | 'Paid' | 'Advance' | 'Due' | 'Cancelled';
export type BookingPaymentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Refunded';

export interface BookingItem {
  id: string;
  propertyId?: string;
  propertyName?: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  customerId?: string;
  room: string;
  roomType?: string;
  checkIn: string;
  checkOut: string;
  checkInTime?: string;
  checkOutTime?: string;
  numberOfNights?: number;
  adults?: number;
  children?: number;
  roomRate?: string;
  roomCharges?: number;
  additionalCharges?: number;
  discounts?: number;
  taxes?: number;
  amount: string;
  totalAmount?: number;
  advance?: string;
  amountPaid?: number;
  outstandingBalance?: number;
  paymentStatus?: BookingPaymentStatus;
  status: BookingStatus;
  channel: Exclude<BookingChannel, 'All'>;
  contact?: string;
  email?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExtendedBookingItem extends BookingItem {
  propertyName?: string;
}

export interface BookingCreateData {
  propertyId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  room: string;
  roomType?: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  amount: string;
  advance?: string;
  channel: Exclude<BookingChannel, 'All'>;
  paymentMethod?: string;
  notes?: string;
}
