import { DashboardKpi } from './dashboard.data';
import { BookingChannel, BookingItem, BookingStatus } from '../../interface';

export type { BookingChannel, BookingStatus, BookingItem };

export const BOOKING_VIEW_SUBTITLE = 'BOOKINGS.SUBTITLE';

export const BOOKING_CHANNEL_FILTERS: readonly BookingChannel[] = [
  'All',
  'Walk-in',
  'Advance',
  'Online',
] as const;

export const BOOKING_KPIS: readonly DashboardKpi[] = [
  {
    id: 'check-in-today',
    label: 'BOOKINGS.KPI.CHECK_IN',
    value: '6',
    icon: 'calendar-outline',
    tone: 'primary',
  },
  {
    id: 'check-out-today',
    label: 'BOOKINGS.KPI.CHECK_OUT',
    value: '4',
    icon: 'calendar-outline',
    tone: 'warm',
  },
  {
    id: 'paid',
    label: 'BOOKINGS.KPI.PAID',
    value: '₹7,650',
    icon: 'rupee',
    tone: 'success',
  },
  {
    id: 'due',
    label: 'BOOKINGS.KPI.DUE',
    value: '₹7,750',
    icon: 'warning-outline',
    tone: 'danger',
  },
] as const;

export const BOOKING_ITEMS: readonly BookingItem[] = [];
