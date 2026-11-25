export type HousekeepingTaskStatus =
  | 'Pending'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Inspection Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Verified'
  | 'Inspection Required';

export type HousekeepingRoomStatus =
  | 'Clean'
  | 'Dirty'
  | 'Cleaning'
  | 'Inspection Pending'
  | 'Inspected'
  | 'Out of Service';

export type HousekeepingTaskType =
  | 'Regular Cleaning'
  | 'Checkout Cleaning'
  | 'Deep Cleaning'
  | 'Bathroom Cleaning'
  | 'Linen Replacement'
  | 'Room Inspection'
  | 'Special Guest Request';

export const HOUSEKEEPING_TASK_TYPES: readonly HousekeepingTaskType[] = [
  'Regular Cleaning',
  'Checkout Cleaning',
  'Deep Cleaning',
  'Bathroom Cleaning',
  'Linen Replacement',
  'Room Inspection',
  'Special Guest Request',
];

export type CleaningPriority = 'Low' | 'Normal' | 'Medium' | 'High' | 'Urgent';

export const INSPECTION_CHECKLIST_LABELS: readonly string[] = [
  'Bed and linen',
  'Bathroom cleanliness',
  'Towels and toiletries',
  'Floor and surfaces',
  'Dustbins',
  'AC and electrical equipment',
  'Lights and switches',
  'Guest amenities',
];

export interface CleaningScheduleItem {
  id: string;
  organizationId?: string;
  propertyId?: string;
  roomId?: string;
  room: string;
  floor?: string;
  type?: string;
  taskType?: HousekeepingTaskType;
  assignedTo?: string;
  assignee?: string;
  assignedStaffId?: string;
  status: HousekeepingTaskStatus;
  time: string;
  dueAt?: string;
  priority?: CleaningPriority;
  instructions?: string;
  notes?: string;
  photos?: string[];
  missingItems?: string[];
  maintenanceIssueId?: string;
  bookingId?: string;
  createdBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  startedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
}

export interface RoomInspectionRecord {
  id: string;
  taskId: string;
  organizationId: string;
  propertyId: string;
  roomId: string;
  roomNumber: string;
  inspectorUid: string;
  inspectorName: string;
  checklist: { label: string; passed: boolean }[];
  notes?: string;
  photos?: string[];
  outcome: 'Approved' | 'Rejected';
  rejectionReason?: string;
  createdAt: string;
}

export interface MaintenanceIssueItem {
  id: string;
  organizationId: string;
  propertyId: string;
  roomId: string;
  roomNumber: string;
  taskId?: string;
  category:
    | 'Broken AC'
    | 'Electrical Problem'
    | 'Plumbing Issue'
    | 'Damaged Furniture'
    | 'Missing Equipment'
    | 'Other';
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved';
  markOutOfService: boolean;
  reportedBy: string;
  reportedByUid: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  label?: string;
  labelKey?: string;
  checked: boolean;
  propertyId?: string;
}

export interface HousekeepingTaskCreateData {
  propertyId: string;
  room: string;
  roomId?: string;
  floor?: string;
  type?: string;
  taskType?: HousekeepingTaskType;
  assignedTo?: string;
  assignedStaffId?: string;
  priority: CleaningPriority;
  dueAt?: string;
  instructions?: string;
  notes?: string;
}
