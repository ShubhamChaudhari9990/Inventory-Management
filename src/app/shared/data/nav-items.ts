import { NavItem } from '../models/nav-item.model';

/** Single source of truth for lodge sidebar navigation. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', route: '/home' },
  { id: 'rooms', label: 'Rooms', icon: 'bed-outline', route: '/rooms' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar-outline', route: '/bookings' },
  { id: 'customers', label: 'Customers', icon: 'people-outline', route: '/customers' },
  { id: 'inventory', label: 'Inventory', icon: 'cube-outline', route: '/inventory' },
  { id: 'revenue', label: 'Revenue', icon: 'cash-outline', route: '/revenue' },
  { id: 'expenses', label: 'Expenses', icon: 'receipt-outline', route: '/expenses' },
  { id: 'staff', label: 'Staff', icon: 'person-circle-outline', route: '/staff' },
  { id: 'housekeeping', label: 'Housekeeping', icon: 'sparkles-outline', route: '/housekeeping' },
  { id: 'reports', label: 'Reports', icon: 'bar-chart-outline', route: '/reports' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', route: '/settings' },
] as const;

export const DEFAULT_NAV_ID = 'dashboard';

export function getNavItemById(id: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.id === id);
}
