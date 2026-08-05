import { DashboardKpi } from './dashboard.data';

export type HousekeepingTaskStatus = 'Completed' | 'Pending';

export interface CleaningScheduleItem {
  id: string;
  room: string;
  assignee: string;
  time: string;
  status: HousekeepingTaskStatus;
}

export interface ChecklistItem {
  id: string;
  labelKey: string;
  checked: boolean;
}

export const HOUSEKEEPING_VIEW_SUBTITLE = 'HOUSEKEEPING.SUBTITLE';

export const HOUSEKEEPING_KPIS: readonly DashboardKpi[] = [
  {
    id: 'cleaning',
    label: 'HOUSEKEEPING.KPI.CLEANING',
    value: '6',
    icon: 'sparkles-outline',
    tone: 'warm',
  },
  {
    id: 'completed',
    label: 'HOUSEKEEPING.KPI.COMPLETED',
    value: '3',
    icon: 'checkmark-circle-outline',
    tone: 'success',
  },
  {
    id: 'pending',
    label: 'HOUSEKEEPING.KPI.PENDING',
    value: '3',
    icon: 'time-outline',
    tone: 'danger',
  },
  {
    id: 'staff',
    label: 'HOUSEKEEPING.KPI.STAFF',
    value: '3',
    icon: 'sparkles-outline',
    tone: 'primary',
  },
] as const;

export const CLEANING_SCHEDULE: readonly CleaningScheduleItem[] = [
  {
    id: 'h1',
    room: '101',
    assignee: 'Ravi Sawant',
    time: '09:00 AM',
    status: 'Completed',
  },
  {
    id: 'h2',
    room: '104',
    assignee: 'Asha Chavan',
    time: '09:30 AM',
    status: 'Completed',
  },
  {
    id: 'h3',
    room: '203',
    assignee: 'Ravi Sawant',
    time: '10:15 AM',
    status: 'Pending',
  },
  {
    id: 'h4',
    room: '207',
    assignee: 'Asha Chavan',
    time: '11:00 AM',
    status: 'Pending',
  },
  {
    id: 'h5',
    room: '302',
    assignee: 'Manoj Gaikwad',
    time: '11:45 AM',
    status: 'Pending',
  },
  {
    id: 'h6',
    room: '305',
    assignee: 'Asha Chavan',
    time: '12:30 PM',
    status: 'Completed',
  },
] as const;

export const CLEANING_CHECKLIST_DEFAULT: readonly ChecklistItem[] = [
  { id: 'c0', labelKey: 'HOUSEKEEPING.CHECK.BEDSHEET', checked: true },
  { id: 'c1', labelKey: 'HOUSEKEEPING.CHECK.BATHROOM', checked: true },
  { id: 'c2', labelKey: 'HOUSEKEEPING.CHECK.WATER', checked: false },
  { id: 'c3', labelKey: 'HOUSEKEEPING.CHECK.FLOOR', checked: false },
  { id: 'c4', labelKey: 'HOUSEKEEPING.CHECK.AC', checked: false },
  { id: 'c5', labelKey: 'HOUSEKEEPING.CHECK.DUSTBIN', checked: false },
] as const;
