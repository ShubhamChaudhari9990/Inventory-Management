export type MaintenanceCategory =
  | 'Electrical'
  | 'Plumbing'
  | 'AC and Cooling'
  | 'Furniture'
  | 'Appliances'
  | 'Building'
  | 'Internet'
  | 'Other';

export const MAINTENANCE_CATEGORIES: readonly MaintenanceCategory[] = [
  'Electrical',
  'Plumbing',
  'AC and Cooling',
  'Furniture',
  'Appliances',
  'Building',
  'Internet',
  'Other',
];

export type MaintenancePriority = 'Low' | 'Normal' | 'High' | 'Emergency';

export const MAINTENANCE_PRIORITIES: readonly MaintenancePriority[] = [
  'Low',
  'Normal',
  'High',
  'Emergency',
];

export type MaintenanceRequestStatus =
  | 'Reported'
  | 'Approved'
  | 'Assigned'
  | 'In Progress'
  | 'Waiting for Parts'
  | 'Completed'
  | 'Verified'
  | 'Rejected'
  | 'Cancelled';

export interface MaintenanceRequestItem {
  id: string;
  organizationId: string;
  propertyId: string;
  roomId?: string;
  roomNumber?: string;
  areaName?: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceRequestStatus;
  photos?: string[];
  notes?: string;
  markRoomOutOfService?: boolean;
  workOrderId?: string;
  reportedBy: string;
  reportedByUid: string;
  reportedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  updatedAt?: string;
}

export type WorkOrderStatus =
  | 'Assigned'
  | 'In Progress'
  | 'Waiting for Parts'
  | 'Completed'
  | 'Verified'
  | 'Closed'
  | 'Cancelled';

export interface WorkOrderIssuedItem {
  movementId: string;
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  returnedQuantity?: number;
  unitCost: number;
  totalCost: number;
  issuedAt: string;
  issuedBy: string;
}

export interface WorkOrderItem {
  id: string;
  workOrderNumber: string;
  requestId?: string;
  organizationId: string;
  propertyId: string;
  roomId?: string;
  roomNumber?: string;
  areaName?: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  assignedTechnicianUid?: string;
  assignedTechnicianName: string;
  repairDescription: string;
  requiredParts?: string;
  issuedItems: WorkOrderIssuedItem[];
  linkedPurchaseOrderIds?: string[];
  labourCost: number;
  materialCost: number;
  totalCost: number;
  status: WorkOrderStatus;
  completionNotes?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  dueDate?: string;
  createdBy: string;
  createdByUid: string;
  createdAt: string;
  completedAt?: string;
  verifiedBy?: string;
  verifiedByUid?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  updatedAt?: string;
}
