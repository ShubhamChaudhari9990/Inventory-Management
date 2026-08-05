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
    label: 'DASHBOARD.KPI.REVENUE',
    value: '₹42,850',
    meta: 'DASHBOARD.KPI.REVENUE_META',
    icon: 'rupee',
    tone: 'success',
  },
  {
    id: 'expenses',
    label: 'DASHBOARD.KPI.EXPENSES',
    value: '₹15,320',
    icon: 'receipt-outline',
    tone: 'danger',
  },
  {
    id: 'profit',
    label: 'DASHBOARD.KPI.PROFIT',
    value: '₹27,530',
    icon: 'trending-up-outline',
    tone: 'primary',
  },
  {
    id: 'available',
    label: 'DASHBOARD.KPI.AVAILABLE',
    value: '6',
    icon: 'door-open',
    tone: 'success',
  },
  {
    id: 'occupied',
    label: 'DASHBOARD.KPI.OCCUPIED',
    value: '9',
    icon: 'bed-outline',
    tone: 'primary',
  },
  {
    id: 'reserved',
    label: 'DASHBOARD.KPI.RESERVED',
    value: '3',
    icon: 'calendar-clock',
    tone: 'secondary',
  },
  {
    id: 'cleaning',
    label: 'DASHBOARD.KPI.CLEANING',
    value: '3',
    icon: 'sparkles-outline',
    tone: 'warm',
  },
  {
    id: 'check-in',
    label: 'DASHBOARD.KPI.CHECK_IN',
    value: '6',
    icon: 'log-in-outline',
    tone: 'primary',
  },
  {
    id: 'check-out',
    label: 'DASHBOARD.KPI.CHECK_OUT',
    value: '4',
    icon: 'log-out-outline',
    tone: 'warm',
  },
  {
    id: 'pending-payments',
    label: 'DASHBOARD.KPI.PENDING_PAYMENTS',
    value: '₹7,750',
    icon: 'warning-outline',
    tone: 'danger',
  },
  {
    id: 'low-stock',
    label: 'DASHBOARD.KPI.LOW_STOCK',
    value: '5',
    icon: 'package-open',
    tone: 'warm',
  },
  {
    id: 'staff-present',
    label: 'DASHBOARD.KPI.STAFF_PRESENT',
    value: '5/6',
    icon: 'user-check',
    tone: 'success',
  },
] as const;

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'new-booking', label: 'DASHBOARD.ACTION.NEW_BOOKING', icon: 'add-outline' },
  { id: 'new-customer', label: 'DASHBOARD.ACTION.NEW_CUSTOMER', icon: 'person-add-outline' },
  { id: 'add-expense', label: 'DASHBOARD.ACTION.ADD_EXPENSE', icon: 'receipt-outline' },
  { id: 'add-inventory', label: 'DASHBOARD.ACTION.ADD_INVENTORY', icon: 'bag-add-outline' },
  { id: 'room-cleaning', label: 'DASHBOARD.ACTION.ROOM_CLEANING', icon: 'sparkles-outline' },
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
  { text: 'DASHBOARD.ACTIVITY.A1', timeAgo: 'DASHBOARD.TIME.12_MIN' },
  { text: 'DASHBOARD.ACTIVITY.A2', timeAgo: 'DASHBOARD.TIME.38_MIN' },
  { text: 'DASHBOARD.ACTIVITY.A3', timeAgo: 'DASHBOARD.TIME.1_HR' },
  { text: 'DASHBOARD.ACTIVITY.A4', timeAgo: 'DASHBOARD.TIME.2_HR' },
  { text: 'DASHBOARD.ACTIVITY.A5', timeAgo: 'DASHBOARD.TIME.3_HR' },
] as const;
