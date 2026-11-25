import { DashboardKpi } from './dashboard.data';
import { StaffAttendanceStatus, StaffMember } from '../../interface';

export type { StaffAttendanceStatus, StaffMember };

export const STAFF_VIEW_SUBTITLE = 'STAFF.SUBTITLE';

export const STAFF_KPIS: readonly DashboardKpi[] = [
  {
    id: 'present',
    label: 'STAFF.KPI.PRESENT',
    value: '0/0',
    icon: 'user-check',
    tone: 'success',
  },
  {
    id: 'leave',
    label: 'STAFF.KPI.ON_LEAVE',
    value: '0',
    icon: 'calendar-outline',
    tone: 'warm',
  },
  {
    id: 'salary',
    label: 'STAFF.KPI.SALARY',
    value: '₹0',
    icon: 'wallet-outline',
    tone: 'primary',
  },
  {
    id: 'advance',
    label: 'STAFF.KPI.ADVANCE',
    value: '₹0',
    icon: 'wallet-outline',
    tone: 'muted',
  },
] as const;

export const STAFF_MEMBERS: readonly StaffMember[] = [];
