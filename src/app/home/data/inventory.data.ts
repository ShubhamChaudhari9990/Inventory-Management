import { DashboardKpi } from './dashboard.data';

export type InventoryStockStatus = 'In stock' | 'Low Stock Alerts';
export type StockMovementTone = 'success' | 'warm' | 'danger';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min: number;
  status: InventoryStockStatus;
  /** 0–100 fill for the stock progress bar */
  fillPercent: number;
}

export interface StockMovement {
  id: string;
  title: string;
  detail: string;
  delta: string;
  tone: StockMovementTone;
}

export const INVENTORY_VIEW_SUBTITLE = 'INVENTORY.SUBTITLE';

export const INVENTORY_KPIS: readonly DashboardKpi[] = [
  {
    id: 'in-stock',
    label: 'INVENTORY.KPI.IN_STOCK',
    value: '755',
    icon: 'cube-outline',
    tone: 'primary',
  },
  {
    id: 'low-stock',
    label: 'INVENTORY.KPI.LOW_STOCK',
    value: '5',
    icon: 'warning-outline',
    tone: 'danger',
  },
  {
    id: 'categories',
    label: 'INVENTORY.KPI.CATEGORIES',
    value: '7',
    icon: 'package-open',
    tone: 'warm',
  },
  {
    id: 'assigned',
    label: 'INVENTORY.KPI.ASSIGNED',
    value: '132',
    icon: 'cube-outline',
    tone: 'success',
  },
] as const;

export const INVENTORY_ITEMS: readonly InventoryItem[] = [
  {
    id: 'bedsheet',
    name: 'Bedsheet',
    category: 'Linen',
    quantity: 84,
    unit: 'pcs',
    min: 40,
    status: 'In stock',
    fillPercent: 100,
  },
  {
    id: 'blanket',
    name: 'Blanket',
    category: 'Linen',
    quantity: 32,
    unit: 'pcs',
    min: 30,
    status: 'In stock',
    fillPercent: 53,
  },
  {
    id: 'pillow',
    name: 'Pillow',
    category: 'Linen',
    quantity: 61,
    unit: 'pcs',
    min: 40,
    status: 'In stock',
    fillPercent: 76,
  },
  {
    id: 'mattress',
    name: 'Mattress',
    category: 'Furniture',
    quantity: 26,
    unit: 'pcs',
    min: 24,
    status: 'In stock',
    fillPercent: 54,
  },
  {
    id: 'bucket',
    name: 'Bucket',
    category: 'Bathroom',
    quantity: 18,
    unit: 'pcs',
    min: 24,
    status: 'Low Stock Alerts',
    fillPercent: 38,
  },
  {
    id: 'mug',
    name: 'Mug',
    category: 'Bathroom',
    quantity: 22,
    unit: 'pcs',
    min: 24,
    status: 'Low Stock Alerts',
    fillPercent: 46,
  },
  {
    id: 'soap',
    name: 'Soap',
    category: 'Amenities',
    quantity: 140,
    unit: 'pcs',
    min: 60,
    status: 'In stock',
    fillPercent: 100,
  },
  {
    id: 'shampoo',
    name: 'Shampoo',
    category: 'Amenities',
    quantity: 46,
    unit: 'sachet',
    min: 60,
    status: 'Low Stock Alerts',
    fillPercent: 38,
  },
  {
    id: 'water-bottle',
    name: 'Water Bottle',
    category: 'Amenities',
    quantity: 210,
    unit: 'pcs',
    min: 100,
    status: 'In stock',
    fillPercent: 100,
  },
  {
    id: 'electric-kettle',
    name: 'Electric Kettle',
    category: 'Appliance',
    quantity: 9,
    unit: 'pcs',
    min: 12,
    status: 'Low Stock Alerts',
    fillPercent: 38,
  },
  {
    id: 'tray',
    name: 'Tray',
    category: 'Utility',
    quantity: 28,
    unit: 'pcs',
    min: 20,
    status: 'In stock',
    fillPercent: 70,
  },
  {
    id: 'chair',
    name: 'Chair',
    category: 'Furniture',
    quantity: 40,
    unit: 'pcs',
    min: 30,
    status: 'In stock',
    fillPercent: 67,
  },
  {
    id: 'table',
    name: 'Table',
    category: 'Furniture',
    quantity: 24,
    unit: 'pcs',
    min: 20,
    status: 'In stock',
    fillPercent: 60,
  },
  {
    id: 'cleaning-material',
    name: 'Cleaning Material',
    category: 'Housekeeping',
    quantity: 15,
    unit: 'kit',
    min: 25,
    status: 'Low Stock Alerts',
    fillPercent: 30,
  },
] as const;

export const STOCK_MOVEMENTS: readonly StockMovement[] = [
  {
    id: 'm1',
    title: 'INVENTORY.MOVEMENT.PURCHASE',
    detail: 'Bedsheet ×40',
    delta: '+40',
    tone: 'success',
  },
  {
    id: 'm2',
    title: 'INVENTORY.MOVEMENT.ASSIGNED',
    detail: 'Blanket ×2',
    delta: '-2',
    tone: 'warm',
  },
  {
    id: 'm3',
    title: 'INVENTORY.MOVEMENT.DAMAGED',
    detail: 'Mug ×3',
    delta: '-3',
    tone: 'danger',
  },
  {
    id: 'm4',
    title: 'INVENTORY.MOVEMENT.RETURNED',
    detail: 'Electric Kettle ×1',
    delta: '+1',
    tone: 'success',
  },
] as const;
