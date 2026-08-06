import { NavItem } from '../models/nav-item.model';

/** Single source of truth for lodge sidebar navigation. Labels are i18n keys. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'NAV.DASHBOARD', icon: 'grid-outline', route: '/home' },
  { id: 'rooms', label: 'NAV.ROOMS', icon: 'bed-outline', route: '/rooms' },
  { id: 'bookings', label: 'NAV.BOOKINGS', icon: 'calendar-outline', route: '/bookings' },
  { id: 'customers', label: 'NAV.CUSTOMERS', icon: 'people-outline', route: '/customers' },
  { id: 'inventory', label: 'NAV.INVENTORY', icon: 'cube-outline', route: '/inventory' },
  { id: 'revenue', label: 'NAV.REVENUE', icon: 'cash-outline', route: '/revenue' },
  { id: 'expenses', label: 'NAV.EXPENSES', icon: 'receipt-outline', route: '/expenses' },
  { id: 'staff', label: 'NAV.STAFF', icon: 'person-circle-outline', route: '/staff' },
  { id: 'housekeeping', label: 'NAV.HOUSEKEEPING', icon: 'sparkles-outline', route: '/housekeeping' },
  { id: 'reports', label: 'NAV.REPORTS', icon: 'bar-chart-outline', route: '/reports' },
  { id: 'settings', label: 'NAV.SETTINGS', icon: 'settings-outline', route: '/settings' },
] as const;

const BOTTOM_NAV_IDS = ['dashboard', 'rooms', 'bookings', 'inventory'] as const;

const MORE_ITEM: NavItem = {
  id: 'more',
  label: 'NAV.MORE',
  icon: 'ellipsis-horizontal',
};

/** Bottom tabs derived from NAV_ITEMS plus the More entry. */
export const BOTTOM_NAV_ITEMS: readonly NavItem[] = [
  ...BOTTOM_NAV_IDS.map((id) => {
    const item = NAV_ITEMS.find((nav) => nav.id === id);
    if (!item) {
      throw new Error(`Missing bottom nav item: ${id}`);
    }
    return { id: item.id, label: item.label, icon: item.icon };
  }),
  MORE_ITEM,
];

export const DEFAULT_NAV_ID = 'dashboard';

export function getNavItemById(id: string): NavItem | undefined {
  return (
    NAV_ITEMS.find((item) => item.id === id) ??
    BOTTOM_NAV_ITEMS.find((item) => item.id === id)
  );
}
