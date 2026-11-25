import { DashboardKpi } from './dashboard.data';
import { ChecklistItem, CleaningScheduleItem, HousekeepingTaskStatus } from '../../interface';

export type { HousekeepingTaskStatus, CleaningScheduleItem, ChecklistItem };

export const HOUSEKEEPING_VIEW_SUBTITLE = 'HOUSEKEEPING.SUBTITLE';

export const HOUSEKEEPING_KPIS: readonly DashboardKpi[] = [
  {
    id: 'cleaning',
    label: 'HOUSEKEEPING.KPI.CLEANING',
    value: '0',
    icon: 'sparkles-outline',
    tone: 'warm',
  },
  {
    id: 'completed',
    label: 'HOUSEKEEPING.KPI.COMPLETED',
    value: '0',
    icon: 'checkmark-circle-outline',
    tone: 'success',
  },
  {
    id: 'pending',
    label: 'HOUSEKEEPING.KPI.PENDING',
    value: '0',
    icon: 'time-outline',
    tone: 'danger',
  },
  {
    id: 'staff',
    label: 'HOUSEKEEPING.KPI.STAFF',
    value: '0',
    icon: 'sparkles-outline',
    tone: 'primary',
  },
] as const;

export const CLEANING_SCHEDULE: readonly CleaningScheduleItem[] = [];

export const CLEANING_CHECKLIST_DEFAULT: readonly ChecklistItem[] = [
  { id: 'c0', labelKey: 'HOUSEKEEPING.CHECK.BEDSHEET', checked: true },
  { id: 'c1', labelKey: 'HOUSEKEEPING.CHECK.BATHROOM', checked: true },
  { id: 'c2', labelKey: 'HOUSEKEEPING.CHECK.WATER', checked: false },
  { id: 'c3', labelKey: 'HOUSEKEEPING.CHECK.FLOOR', checked: false },
  { id: 'c4', labelKey: 'HOUSEKEEPING.CHECK.AC', checked: false },
  { id: 'c5', labelKey: 'HOUSEKEEPING.CHECK.DUSTBIN', checked: false },
] as const;
