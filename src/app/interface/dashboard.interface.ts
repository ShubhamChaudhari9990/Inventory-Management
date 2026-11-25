import { PropertyStatus } from './property.interface';

export type DashboardKpiTone =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'muted'
  | 'success'
  | 'warm'
  | 'accent';

export type DashboardDateFilter =
  | 'today'
  | 'week'
  | 'month'
  | 'last_month'
  | 'year'
  | 'custom';

export interface DateRangeSelection {
  filter: DashboardDateFilter;
  startDate?: string;
  endDate?: string;
}

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  meta?: string;
  icon: string;
  tone: DashboardKpiTone;
  change?: string;
  changeTone?: 'up' | 'down' | 'neutral';
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route?: string;
  permission?: string;
  color?: string;
}

export interface RecentBooking {
  id?: string;
  guest: string;
  room: string;
  checkIn: string;
  checkOut?: string;
  amount: string;
  status: 'Paid' | 'Due' | 'Pending' | 'Advance' | 'Cancelled';
  propertyId?: string;
  propertyName?: string;
  contact?: string;
}

export interface RecentPayment {
  id?: string;
  guest: string;
  method: string;
  amount: string;
  time: string;
  propertyId?: string;
  propertyName?: string;
  status?: string;
}

export interface ActivityItem {
  id?: string;
  title?: string;
  text?: string;
  time?: string;
  timeAgo?: string;
  icon?: string;
  propertyId?: string;
  propertyName?: string;
  type?: 'booking' | 'payment' | 'housekeeping' | 'maintenance' | 'system';
}

export interface LodgePerformanceItem {
  id: string;
  name: string;
  code: string;
  city: string;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
  pendingDues: number;
  status: PropertyStatus;
}

export interface ArrivalDepartureItem {
  id: string;
  guestName: string;
  phone: string;
  roomNumber: string;
  roomType: string;
  scheduledTime: string;
  status: 'Expected' | 'Checked In' | 'Checked Out' | 'Delayed';
  amountDue: number;
  paymentStatus: 'Paid' | 'Partial' | 'Pending';
  propertyId: string;
}

export interface DashboardMaintenanceItem {
  id: string;
  roomNumber: string;
  issue: string;
  category: 'Plumbing' | 'Electrical' | 'HVAC' | 'Carpentry' | 'General';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'Reported' | 'In Progress' | 'Resolved';
  reportedAt: string;
  assignedTo?: string;
  propertyId: string;
}

export interface StaffShiftItem {
  id: string;
  name: string;
  designation: string;
  shift: 'Morning' | 'Evening' | 'Night' | 'Full Day';
  status: 'Present' | 'On Break' | 'Absent' | 'Off Duty';
  contact: string;
  propertyId: string;
}

export interface ImportantAlertItem {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
  time: string;
  actionLabel?: string;
  actionId?: string;
  propertyId?: string;
}

export interface StaffTaskItem {
  id: string;
  title: string;
  description?: string;
  room?: string;
  assignedTo?: string;
  category: 'cleaning' | 'maintenance' | 'reception' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  scheduledTime?: string;
  dueDate?: string;
  propertyId: string;
}

export interface DashboardData {
  kpis: DashboardKpi[];
  recentBookings: RecentBooking[];
  recentPayments: RecentPayment[];
  recentActivity: ActivityItem[];
}
