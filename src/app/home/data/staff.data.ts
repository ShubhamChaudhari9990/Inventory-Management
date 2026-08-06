import { DashboardKpi } from './dashboard.data';

export type StaffAttendanceStatus = 'Present' | 'On Leave';

export interface StaffMember {
  id: string;
  initials: string;
  name: string;
  roleKey: string;
  phone: string;
  salary: string;
  status: StaffAttendanceStatus;
}

export const STAFF_VIEW_SUBTITLE = 'STAFF.SUBTITLE';

export const STAFF_KPIS: readonly DashboardKpi[] = [
  {
    id: 'present',
    label: 'STAFF.KPI.PRESENT',
    value: '5/6',
    icon: 'user-check',
    tone: 'success',
  },
  {
    id: 'leave',
    label: 'STAFF.KPI.ON_LEAVE',
    value: '1',
    icon: 'calendar-outline',
    tone: 'warm',
  },
  {
    id: 'salary',
    label: 'STAFF.KPI.SALARY',
    value: '₹1,02,500',
    icon: 'wallet-outline',
    tone: 'primary',
  },
  {
    id: 'advance',
    label: 'STAFF.KPI.ADVANCE',
    value: '₹8,000',
    icon: 'wallet-outline',
    tone: 'muted',
  },
] as const;

export const STAFF_MEMBERS: readonly StaffMember[] = [
  {
    id: 's1',
    initials: 'GK',
    name: 'Ganesh Kadam',
    roleKey: 'STAFF.ROLE.MANAGER',
    phone: '98500 11222',
    salary: '₹28,000',
    status: 'Present',
  },
  {
    id: 's2',
    initials: 'SB',
    name: 'Sunita Bhosale',
    roleKey: 'STAFF.ROLE.RECEPTION',
    phone: '97300 41123',
    salary: '₹18,000',
    status: 'Present',
  },
  {
    id: 's3',
    initials: 'RS',
    name: 'Ravi Sawant',
    roleKey: 'STAFF.ROLE.HOUSEKEEPING',
    phone: '90110 88221',
    salary: '₹14,000',
    status: 'Present',
  },
  {
    id: 's4',
    initials: 'MG',
    name: 'Manoj Gaikwad',
    roleKey: 'STAFF.ROLE.HOUSEKEEPING',
    phone: '88221 76540',
    salary: '₹14,000',
    status: 'On Leave',
  },
  {
    id: 's5',
    initials: 'AC',
    name: 'Asha Chavan',
    roleKey: 'STAFF.ROLE.HOUSEKEEPING',
    phone: '70998 22110',
    salary: '₹13,500',
    status: 'Present',
  },
  {
    id: 's6',
    initials: 'SN',
    name: 'Sagar Nikam',
    roleKey: 'STAFF.ROLE.SECURITY',
    phone: '89901 33445',
    salary: '₹15,000',
    status: 'Present',
  },
] as const;
