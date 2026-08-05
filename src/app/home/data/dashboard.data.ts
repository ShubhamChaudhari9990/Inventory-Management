export type DashboardKpiTone =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'muted'
  | 'success'
  | 'warm';

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  meta?: string;
  icon: string;
  tone: DashboardKpiTone;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
}

export interface RecentBooking {
  guest: string;
  room: string;
  checkIn: string;
  amount: string;
  status: 'Paid' | 'Due';
}

export interface RecentPayment {
  guest: string;
  method: string;
  time: string;
  amount: string;
}

export interface ActivityItem {
  text: string;
  timeAgo: string;
}

export const DASHBOARD_KPIS: readonly DashboardKpi[] = [
  {
    id: 'revenue',
    label: "Today's Revenue",
    value: '₹42,850',
    meta: '+12% vs yesterday',
    icon: 'rupee',
    tone: 'success',
  },
  {
    id: 'expenses',
    label: "Today's Expenses",
    value: '₹15,320',
    icon: 'receipt-outline',
    tone: 'danger',
  },
  {
    id: 'profit',
    label: "Today's Profit",
    value: '₹27,530',
    icon: 'trending-up-outline',
    tone: 'primary',
  },
  {
    id: 'available',
    label: 'Available',
    value: '6',
    icon: 'door-open',
    tone: 'success',
  },
  {
    id: 'occupied',
    label: 'Occupied',
    value: '9',
    icon: 'bed-outline',
    tone: 'primary',
  },
  {
    id: 'reserved',
    label: 'Reserved',
    value: '3',
    icon: 'calendar-clock',
    tone: 'secondary',
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    value: '3',
    icon: 'sparkles-outline',
    tone: 'warm',
  },
  {
    id: 'check-in',
    label: 'Check-in Today',
    value: '6',
    icon: 'log-in-outline',
    tone: 'primary',
  },
  {
    id: 'check-out',
    label: 'Check-out Today',
    value: '4',
    icon: 'log-out-outline',
    tone: 'warm',
  },
  {
    id: 'pending-payments',
    label: 'Pending Payments',
    value: '₹7,750',
    icon: 'warning-outline',
    tone: 'danger',
  },
  {
    id: 'low-stock',
    label: 'Low Stock Alerts',
    value: '5',
    icon: 'package-open',
    tone: 'warm',
  },
  {
    id: 'staff-present',
    label: 'Staff Present Today',
    value: '5/6',
    icon: 'user-check',
    tone: 'success',
  },
] as const;

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'new-booking', label: 'New Booking', icon: 'add-outline' },
  { id: 'new-customer', label: 'New Customer', icon: 'person-add-outline' },
  { id: 'add-expense', label: 'Add Expense', icon: 'receipt-outline' },
  { id: 'add-inventory', label: 'Add Inventory', icon: 'bag-add-outline' },
  { id: 'room-cleaning', label: 'Room Cleaning', icon: 'sparkles-outline' },
] as const;

export const RECENT_BOOKINGS: readonly RecentBooking[] = [
  { guest: 'Rahul Deshmukh', room: '101', checkIn: '26 Jul', amount: '₹1,800', status: 'Paid' },
  { guest: 'Sneha Patil', room: '204', checkIn: '26 Jul', amount: '₹5,400', status: 'Due' },
  { guest: 'Amit Joshi', room: '108', checkIn: '27 Jul', amount: '₹2,250', status: 'Paid' },
  { guest: 'Pooja Kulkarni', room: '305', checkIn: '25 Jul', amount: '₹1,350', status: 'Due' },
  { guest: 'Nitin Shinde', room: '202', checkIn: '24 Jul', amount: '₹3,600', status: 'Paid' },
] as const;

export const RECENT_PAYMENTS: readonly RecentPayment[] = [
  { guest: 'Rahul Deshmukh', method: 'UPI', time: '10:24 AM', amount: '₹1,800' },
  { guest: 'Amit Joshi', method: 'Cash', time: '09:50 AM', amount: '₹2,250' },
  { guest: 'Sneha Patil', method: 'Card', time: '09:12 AM', amount: '₹2,000' },
  { guest: 'Nitin Shinde', method: 'Bank Transfer', time: '08:40 AM', amount: '₹3,600' },
] as const;

export const RECENT_ACTIVITY: readonly ActivityItem[] = [
  { text: 'Room 204 checked in — Sneha Patil', timeAgo: '12 min' },
  { text: 'Payment ₹2,250 received via cash', timeAgo: '38 min' },
  { text: 'Room 302 marked for cleaning', timeAgo: '1 hr' },
  { text: 'Low stock: Bucket (18 left)', timeAgo: '2 hr' },
  { text: 'Manoj Gaikwad marked on leave', timeAgo: '3 hr' },
] as const;
