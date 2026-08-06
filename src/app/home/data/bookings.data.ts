import { DashboardKpi } from './dashboard.data';

export type BookingChannel = 'All' | 'Walk-in' | 'Advance' | 'Online';
export type BookingStatus = 'Paid' | 'Due' | 'Cancelled';

export interface BookingItem {
  id: string;
  guestName: string;
  guestPhone: string;
  room: string;
  checkIn: string;
  checkOut: string;
  amount: string;
  status: BookingStatus;
  channel: Exclude<BookingChannel, 'All'>;
}

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

export const BOOKING_ITEMS: readonly BookingItem[] = [
  {
    id: 'BK-2481',
    guestName: 'Rahul Deshmukh',
    guestPhone: '98220 11223',
    room: '101',
    checkIn: '26 Jul',
    checkOut: '27 Jul',
    amount: '₹1,800',
    status: 'Paid',
    channel: 'Walk-in',
  },
  {
    id: 'BK-2480',
    guestName: 'Sneha Patil',
    guestPhone: '90280 44561',
    room: '204',
    checkIn: '26 Jul',
    checkOut: '29 Jul',
    amount: '₹5,400',
    status: 'Due',
    channel: 'Advance',
  },
  {
    id: 'BK-2479',
    guestName: 'Amit Joshi',
    guestPhone: '70301 98120',
    room: '108',
    checkIn: '27 Jul',
    checkOut: '28 Jul',
    amount: '₹2,250',
    status: 'Paid',
    channel: 'Online',
  },
  {
    id: 'BK-2478',
    guestName: 'Pooja Kulkarni',
    guestPhone: '88881 23409',
    room: '305',
    checkIn: '25 Jul',
    checkOut: '26 Jul',
    amount: '₹1,350',
    status: 'Due',
    channel: 'Walk-in',
  },
  {
    id: 'BK-2477',
    guestName: 'Nitin Shinde',
    guestPhone: '97655 30021',
    room: '202',
    checkIn: '24 Jul',
    checkOut: '26 Jul',
    amount: '₹3,600',
    status: 'Paid',
    channel: 'Advance',
  },
  {
    id: 'BK-2476',
    guestName: 'Kiran More',
    guestPhone: '93711 55620',
    room: '307',
    checkIn: '28 Jul',
    checkOut: '30 Jul',
    amount: '₹4,500',
    status: 'Due',
    channel: 'Online',
  },
  {
    id: 'BK-2475',
    guestName: 'Anjali Pawar',
    guestPhone: '89999 71234',
    room: '103',
    checkIn: '23 Jul',
    checkOut: '24 Jul',
    amount: '₹1,200',
    status: 'Cancelled',
    channel: 'Walk-in',
  },
] as const;
