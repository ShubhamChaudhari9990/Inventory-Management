import { DashboardKpi } from './dashboard.data';
import {
  InventoryItem,
  InventoryStockStatus,
  StockMovement,
  StockMovementTone,
} from '../../interface';

export type { InventoryStockStatus, StockMovementTone, InventoryItem, StockMovement };

export const INVENTORY_VIEW_SUBTITLE = 'INVENTORY.SUBTITLE';

export const INVENTORY_KPIS: readonly DashboardKpi[] = [
  {
    id: 'in-stock',
    label: 'INVENTORY.KPI.IN_STOCK',
    value: '0',
    icon: 'cube-outline',
    tone: 'primary',
  },
  {
    id: 'low-stock',
    label: 'INVENTORY.KPI.LOW_STOCK',
    value: '0',
    icon: 'warning-outline',
    tone: 'danger',
  },
  {
    id: 'categories',
    label: 'INVENTORY.KPI.CATEGORIES',
    value: '0',
    icon: 'package-open',
    tone: 'warm',
  },
  {
    id: 'assigned',
    label: 'INVENTORY.KPI.ASSIGNED',
    value: '0',
    icon: 'cube-outline',
    tone: 'success',
  },
] as const;

export const INVENTORY_ITEMS: readonly InventoryItem[] = [];

export const STOCK_MOVEMENTS: readonly StockMovement[] = [];
