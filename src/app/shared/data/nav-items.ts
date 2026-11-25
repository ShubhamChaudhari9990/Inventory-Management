import { NavItem, PermissionKey, UserRole } from '../../interface';

/** Master configuration for all lodge sidebar and bottom navigation items. */
export const MASTER_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'dashboard',
    label: 'NAV.DASHBOARD',
    icon: 'grid-outline',
    route: '/home',
    roles: ['owner', 'manager', 'staff'],
    permissions: ['dashboard.view'],
  },
  {
    id: 'my-tasks',
    label: 'NAV.MY_TASKS',
    icon: 'checkbox-outline',
    route: '/staff/dashboard',
    roles: ['staff'],
  },
  {
    id: 'lodges',
    label: 'NAV.MY_LODGES',
    icon: 'business-outline',
    route: '/lodges',
    roles: ['owner', 'manager'],
    permissions: ['property.view'],
  },
  {
    id: 'rooms',
    label: 'NAV.ROOMS',
    icon: 'bed-outline',
    route: '/rooms',
    roles: ['owner', 'manager', 'staff'],
    permissions: ['rooms.view', 'rooms.view_assigned'],
  },
  {
    id: 'bookings',
    label: 'NAV.BOOKINGS',
    icon: 'calendar-outline',
    route: '/bookings',
    roles: ['owner', 'manager', 'staff'],
    permissions: ['booking.view'],
  },
  {
    id: 'checkin',
    label: 'NAV.CHECKIN',
    icon: 'log-in-outline',
    route: '/checkin',
    roles: ['manager'],
    permissions: ['guest.checkin'],
  },
  {
    id: 'customers',
    label: 'NAV.CUSTOMERS',
    icon: 'people-outline',
    route: '/customers',
    roles: ['owner', 'manager'],
    permissions: ['guest.view'],
  },
  {
    id: 'payments',
    label: 'NAV.PAYMENTS',
    icon: 'card-outline',
    route: '/payments',
    roles: ['owner', 'manager'],
    permissions: ['finance.view'],
  },
  {
    id: 'inventory',
    label: 'NAV.INVENTORY',
    icon: 'cube-outline',
    route: '/inventory',
    roles: ['owner', 'manager'],
  },
  {
    id: 'revenue',
    label: 'NAV.REVENUE',
    icon: 'cash-outline',
    route: '/revenue',
    roles: ['owner'],
    permissions: ['finance.view'],
  },
  {
    id: 'expenses',
    label: 'NAV.EXPENSES',
    icon: 'receipt-outline',
    route: '/expenses',
    roles: ['owner'],
    permissions: ['finance.expenses.view'],
  },
  {
    id: 'staff',
    label: 'NAV.STAFF',
    icon: 'person-circle-outline',
    route: '/staff',
    roles: ['owner', 'manager'],
    permissions: ['staff.view'],
  },
  {
    id: 'housekeeping',
    label: 'NAV.HOUSEKEEPING',
    icon: 'sparkles-outline',
    route: '/housekeeping',
    roles: ['owner', 'manager', 'staff'],
    permissions: ['housekeeping.view'],
  },
  {
    id: 'maintenance',
    label: 'NAV.MAINTENANCE',
    icon: 'build-outline',
    route: '/maintenance',
    roles: ['owner', 'manager', 'staff'],
    permissions: ['maintenance.view'],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: 'construct-outline',
    route: '/operations',
    roles: ['owner', 'manager', 'staff'],
  },
  {
    id: 'reports',
    label: 'NAV.REPORTS',
    icon: 'bar-chart-outline',
    route: '/reports',
    roles: ['owner', 'manager'],
    permissions: ['reports.view'],
  },
  {
    id: 'notifications',
    label: 'NAV.NOTIFICATIONS',
    icon: 'notifications-outline',
    route: '/notifications',
    roles: ['staff'],
    permissions: ['notifications.view'],
  },
  {
    id: 'settings',
    label: 'NAV.SETTINGS',
    icon: 'settings-outline',
    route: '/settings',
    roles: ['owner', 'manager', 'staff'],
    permissions: ['settings.view'],
  },
] as const;

export const DEFAULT_NAV_ID = 'dashboard';

/** Filter navigation items dynamically based on active user role and granted permissions. */
export function getNavItemsForRole(
  role: UserRole,
  hasPermissionFn?: (permission: PermissionKey) => boolean,
): NavItem[] {
  return MASTER_NAV_ITEMS.filter((item) => {
    // 1. Role verification
    if (item.roles && !item.roles.includes(role)) {
      return false;
    }
    // 2. Permission verification (Owners bypass individual permission checks)
    if (role !== 'owner' && item.permissions && item.permissions.length > 0 && hasPermissionFn) {
      const hasAny = item.permissions.some((p) => hasPermissionFn(p));
      if (!hasAny) return false;
    }
    return true;
  });
}

/** Bottom tabs derived from role-filtered items plus the More entry. */
export function getBottomNavItemsForRole(
  role: UserRole,
  hasPermissionFn?: (permission: PermissionKey) => boolean,
): NavItem[] {
  const allowed = getNavItemsForRole(role, hasPermissionFn);

  let preferredIds: string[];
  if (role === 'staff') {
    preferredIds = ['dashboard', 'my-tasks', 'housekeeping', 'maintenance'];
  } else if (role === 'manager') {
    preferredIds = ['dashboard', 'rooms', 'bookings', 'checkin'];
  } else {
    // Owner
    preferredIds = ['dashboard', 'lodges', 'rooms', 'bookings'];
  }

  const primaryItems = allowed.filter((item) => preferredIds.includes(item.id)).slice(0, 4);

  // If fewer than 4 preferred items exist in allowed, fill with remaining allowed items
  if (primaryItems.length < 4) {
    for (const item of allowed) {
      if (!primaryItems.some((p) => p.id === item.id) && primaryItems.length < 4) {
        primaryItems.push(item);
      }
    }
  }

  return primaryItems;
}

// Backward compatibility export
export const NAV_ITEMS = MASTER_NAV_ITEMS;
export const BOTTOM_NAV_ITEMS = MASTER_NAV_ITEMS.slice(0, 4);

export function getNavItemById(id: string): NavItem | undefined {
  return MASTER_NAV_ITEMS.find((item) => item.id === id);
}
