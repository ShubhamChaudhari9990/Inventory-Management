export type InventoryCategory =
  | 'Housekeeping'
  | 'Room Supplies'
  | 'Toiletries'
  | 'Electrical'
  | 'Plumbing'
  | 'Furniture'
  | 'Kitchen'
  | 'Office'
  | 'Maintenance'
  | 'Cleaning Supplies'
  | 'Food & Beverages'
  | 'Bedding'
  | 'Electrical Items'
  | 'Other';

export const INVENTORY_CATEGORIES: readonly string[] = [
  'Housekeeping',
  'Room Supplies',
  'Toiletries',
  'Electrical',
  'Plumbing',
  'Furniture',
  'Kitchen',
  'Office',
  'Maintenance',
  'Other',
];

export const INVENTORY_UNITS: readonly string[] = [
  'Piece',
  'Box',
  'Packet',
  'Bottle',
  'Kilogram',
  'Litre',
  'Set',
  'Pair',
];

export type InventoryStockStatus =
  | 'In stock'
  | 'In Stock'
  | 'Low Stock Alerts'
  | 'Out of Stock';

export type InventoryStatus = InventoryStockStatus;

export type StockMovementTone = 'success' | 'warm' | 'danger';

export type InventoryMovementType =
  | 'Opening Stock'
  | 'Purchase In'
  | 'Issue Out'
  | 'Return In'
  | 'Transfer Out'
  | 'Transfer In'
  | 'Adjustment In'
  | 'Adjustment Out'
  | 'Consumption'
  | 'Purchase'
  | 'Damage'
  | 'Adjustment'
  | 'Transfer';

export type ItemTrackingType = 'Consumable' | 'Trackable' | 'Serialized';

export interface InventoryItem {
  id: string;
  organizationId?: string;
  propertyId?: string;
  name: string;
  category: InventoryCategory | string;
  sku?: string;
  description?: string;
  brand?: string;
  imageUrl?: string;
  unit: string;
  openingStock?: number;
  quantity: number;
  inTransitQuantity?: number;
  usedQuantity?: number;
  damagedQuantity?: number;
  min: number;
  reorderQuantity?: number;
  storageLocation?: string;
  purchasePrice?: number;
  supplier?: string;
  preferredSupplierId?: string;
  lastPurchaseDate?: string;
  trackingType?: ItemTrackingType;
  serialNumber?: string;
  serialNumbers?: string[];
  batchNumber?: string;
  expiryDate?: string;
  allowNegativeStock?: boolean;
  status: InventoryStockStatus;
  fillPercent?: number;
  lastUpdated?: string;
  createdAt?: string;
}

export interface StockMovement {
  id: string;
  organizationId?: string;
  propertyId?: string;
  itemId?: string;
  itemName?: string;
  title?: string;
  detail?: string;
  delta?: string;
  change?: number;
  quantity?: number;
  type?: InventoryMovementType;
  movementType?: InventoryMovementType;
  unitCost?: number;
  referenceType?: 'PO' | 'WorkOrder' | 'Transfer' | 'Housekeeping' | 'Manual';
  referenceId?: string;
  department?: 'Housekeeping' | 'Maintenance' | 'Reception' | 'Kitchen' | 'Other';
  issuedTo?: string;
  fromLocation?: string;
  toLocation?: string;
  reason?: string;
  supplier?: string;
  invoiceNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  cost?: number;
  performedBy?: string;
  performedById?: string;
  approvedBy?: string;
  idempotencyKey?: string;
  notes?: string;
  timestamp?: string;
  createdAt?: string;
  tone?: StockMovementTone;
}

export interface InventoryItemFormData {
  propertyId: string;
  name: string;
  category: InventoryCategory | string;
  sku?: string;
  description?: string;
  brand?: string;
  imageUrl?: string;
  unit: string;
  openingStock?: number;
  quantity: number;
  min: number;
  reorderQuantity?: number;
  storageLocation?: string;
  purchasePrice?: number;
  supplier?: string;
  preferredSupplierId?: string;
  trackingType?: ItemTrackingType;
  serialNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  allowNegativeStock?: boolean;
}

export interface SupplierItem {
  id: string;
  organizationId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  suppliedCategories: string[];
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseOrderLineItem {
  itemId: string;
  itemName: string;
  sku?: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
}

export type PurchaseOrderStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Ordered'
  | 'Partially Received'
  | 'Received'
  | 'Cancelled';

export interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  organizationId: string;
  propertyId: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  expectedDeliveryDate?: string;
  status: PurchaseOrderStatus;
  linkedWorkOrderId?: string;
  expenseRecorded?: boolean;
  expenseId?: string;
  notes?: string;
  createdBy: string;
  createdByUid: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type StockTransferStatus =
  | 'Draft'
  | 'Requested'
  | 'Approved'
  | 'Dispatched'
  | 'Received'
  | 'Rejected'
  | 'Cancelled';

export interface StockTransferItem {
  id: string;
  organizationId: string;
  sourcePropertyId: string;
  sourcePropertyName?: string;
  destinationPropertyId: string;
  destinationPropertyName?: string;
  sourceItemId: string;
  destinationItemId?: string;
  itemName: string;
  sku?: string;
  unit: string;
  quantity: number;
  status: StockTransferStatus;
  notes?: string;
  requestedBy: string;
  requestedByUid: string;
  approvedBy?: string;
  approvedByUid?: string;
  dispatchedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StorageLocationItem {
  id: string;
  organizationId: string;
  propertyId: string;
  name: string;
  code?: string;
  type: 'Main Store' | 'Floor Closet' | 'Maintenance Room' | 'Kitchen Store' | 'Other';
  description?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface InventoryTaxonomyConfig {
  id: string;
  organizationId: string;
  customCategories: string[];
  customUnits: string[];
  updatedAt: string;
}
