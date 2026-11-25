import {
  ActivityItem,
  DashboardKpi,
  DashboardKpiTone,
  QuickAction,
  RecentBooking,
  RecentPayment,
} from '../../interface';

export type {
  DashboardKpiTone,
  DashboardKpi,
  QuickAction,
  RecentBooking,
  RecentPayment,
  ActivityItem,
};

export const DASHBOARD_KPIS: readonly DashboardKpi[] = [
  {
    id: 'revenue',
    label: 'DASHBOARD.KPI.REVENUE',
    value: '₹0',
    meta: 'DASHBOARD.KPI.REVENUE_META',
    icon: 'rupee',
    tone: 'success',
  },
  {
    id: 'expenses',
    label: 'DASHBOARD.KPI.EXPENSES',
    value: '₹0',
    icon: 'receipt-outline',
    tone: 'danger',
  },
  {
    id: 'profit',
    label: 'DASHBOARD.KPI.PROFIT',
    value: '₹0',
    icon: 'trending-up-outline',
    tone: 'primary',
  },
  {
    id: 'available',
    label: 'DASHBOARD.KPI.AVAILABLE',
    value: '0',
    icon: 'door-open',
    tone: 'success',
  },
  {
    id: 'occupied',
    label: 'DASHBOARD.KPI.OCCUPIED',
    value: '0',
    icon: 'bed-outline',
    tone: 'primary',
  },
  {
    id: 'reserved',
    label: 'DASHBOARD.KPI.RESERVED',
    value: '0',
    icon: 'calendar-clock',
    tone: 'secondary',
  },
  {
    id: 'cleaning',
    label: 'DASHBOARD.KPI.CLEANING',
    value: '0',
    icon: 'sparkles-outline',
    tone: 'warm',
  },
  {
    id: 'check-in',
    label: 'DASHBOARD.KPI.CHECK_IN',
    value: '0',
    icon: 'log-in-outline',
    tone: 'primary',
  },
  {
    id: 'check-out',
    label: 'DASHBOARD.KPI.CHECK_OUT',
    value: '0',
    icon: 'log-out-outline',
    tone: 'warm',
  },
  {
    id: 'pending-payments',
    label: 'DASHBOARD.KPI.PENDING_PAYMENTS',
    value: '₹0',
    icon: 'warning-outline',
    tone: 'danger',
  },
  {
    id: 'low-stock',
    label: 'DASHBOARD.KPI.LOW_STOCK',
    value: '0',
    icon: 'package-open',
    tone: 'warm',
  },
  {
    id: 'staff-present',
    label: 'DASHBOARD.KPI.STAFF_PRESENT',
    value: '0/0',
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

export const RECENT_BOOKINGS: readonly RecentBooking[] = [];

export const RECENT_PAYMENTS: readonly RecentPayment[] = [];

export const RECENT_ACTIVITY: readonly ActivityItem[] = [];
