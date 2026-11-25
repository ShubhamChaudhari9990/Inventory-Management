import { Injectable, inject } from '@angular/core';
import {
  PermissionCategory,
  PermissionDefinition,
  PermissionGroup,
  PermissionKey,
  StaffDesignation,
  UserRole,
} from '../interface';
import { RoleService } from './role.service';

export const ALL_PERMISSIONS: readonly PermissionDefinition[] = [
  // Dashboard
  { key: 'dashboard.view', labelKey: 'PERMISSIONS.DASHBOARD_VIEW', category: 'dashboard' },

  // Properties / Lodges
  { key: 'property.view', labelKey: 'PERMISSIONS.PROPERTY_VIEW', category: 'properties' },
  { key: 'property.create', labelKey: 'PERMISSIONS.PROPERTY_CREATE', category: 'properties' },
  { key: 'property.update', labelKey: 'PERMISSIONS.PROPERTY_UPDATE', category: 'properties' },
  { key: 'property.delete', labelKey: 'PERMISSIONS.PROPERTY_DELETE', category: 'properties' },

  // Rooms
  { key: 'rooms.view', labelKey: 'PERMISSIONS.ROOMS_VIEW', category: 'rooms' },
  { key: 'rooms.create', labelKey: 'PERMISSIONS.ROOMS_CREATE', category: 'rooms' },
  { key: 'rooms.update', labelKey: 'PERMISSIONS.ROOMS_UPDATE', category: 'rooms' },
  { key: 'rooms.delete', labelKey: 'PERMISSIONS.ROOMS_DELETE', category: 'rooms' },
  { key: 'rooms.view_assigned', labelKey: 'PERMISSIONS.ROOMS_VIEW_ASSIGNED', category: 'rooms' },

  // Reservations
  { key: 'booking.view', labelKey: 'PERMISSIONS.BOOKING_VIEW', category: 'reservations' },
  { key: 'booking.create', labelKey: 'PERMISSIONS.BOOKING_CREATE', category: 'reservations' },
  { key: 'booking.update', labelKey: 'PERMISSIONS.BOOKING_UPDATE', category: 'reservations' },
  { key: 'booking.cancel', labelKey: 'PERMISSIONS.BOOKING_CANCEL', category: 'reservations' },

  // Guests
  { key: 'guest.view', labelKey: 'PERMISSIONS.GUEST_VIEW', category: 'guests' },
  { key: 'guest.create', labelKey: 'PERMISSIONS.GUEST_CREATE', category: 'guests' },
  { key: 'guest.update', labelKey: 'PERMISSIONS.GUEST_UPDATE', category: 'guests' },

  // Check-in / Check-out
  { key: 'guest.checkin', labelKey: 'PERMISSIONS.GUEST_CHECKIN', category: 'checkin' },
  { key: 'guest.checkout', labelKey: 'PERMISSIONS.GUEST_CHECKOUT', category: 'checkin' },
  { key: 'room.assign', labelKey: 'PERMISSIONS.ROOM_ASSIGN', category: 'checkin' },

  // Staff
  { key: 'staff.view', labelKey: 'PERMISSIONS.STAFF_VIEW', category: 'staff' },
  { key: 'staff.create', labelKey: 'PERMISSIONS.STAFF_CREATE', category: 'staff' },
  { key: 'staff.update', labelKey: 'PERMISSIONS.STAFF_UPDATE', category: 'staff' },
  { key: 'staff.delete', labelKey: 'PERMISSIONS.STAFF_DELETE', category: 'staff' },
  { key: 'staff.assign_tasks', labelKey: 'PERMISSIONS.STAFF_ASSIGN_TASKS', category: 'staff' },

  // Housekeeping
  { key: 'housekeeping.view', labelKey: 'PERMISSIONS.HOUSEKEEPING_VIEW', category: 'housekeeping' },
  { key: 'housekeeping.assign', labelKey: 'PERMISSIONS.HOUSEKEEPING_ASSIGN', category: 'housekeeping' },
  { key: 'housekeeping.update_status', labelKey: 'PERMISSIONS.HOUSEKEEPING_UPDATE_STATUS', category: 'housekeeping' },
  { key: 'housekeeping.inspect', labelKey: 'PERMISSIONS.HOUSEKEEPING_INSPECT', category: 'housekeeping' },

  // Maintenance
  { key: 'maintenance.view', labelKey: 'PERMISSIONS.MAINTENANCE_VIEW', category: 'maintenance' },
  { key: 'maintenance.create_request', labelKey: 'PERMISSIONS.MAINTENANCE_CREATE_REQUEST', category: 'maintenance' },
  { key: 'maintenance.assign', labelKey: 'PERMISSIONS.MAINTENANCE_ASSIGN', category: 'maintenance' },
  { key: 'maintenance.update_status', labelKey: 'PERMISSIONS.MAINTENANCE_UPDATE_STATUS', category: 'maintenance' },

  // Finance
  { key: 'finance.view', labelKey: 'PERMISSIONS.FINANCE_VIEW', category: 'finance' },
  { key: 'finance.payment.collect', labelKey: 'PERMISSIONS.FINANCE_PAYMENT_COLLECT', category: 'finance' },
  { key: 'finance.expenses.view', labelKey: 'PERMISSIONS.FINANCE_EXPENSES_VIEW', category: 'finance' },
  { key: 'finance.expenses.create', labelKey: 'PERMISSIONS.FINANCE_EXPENSES_CREATE', category: 'finance' },
  { key: 'finance.expenses.update', labelKey: 'PERMISSIONS.FINANCE_EXPENSES_UPDATE', category: 'finance' },

  // Reports
  { key: 'reports.view', labelKey: 'PERMISSIONS.REPORTS_VIEW', category: 'reports' },
  { key: 'reports.export', labelKey: 'PERMISSIONS.REPORTS_EXPORT', category: 'reports' },

  // Notifications
  { key: 'notifications.view', labelKey: 'PERMISSIONS.NOTIFICATIONS_VIEW', category: 'notifications' },
  { key: 'notifications.update', labelKey: 'PERMISSIONS.NOTIFICATIONS_UPDATE', category: 'notifications' },

  // Settings
  { key: 'settings.view', labelKey: 'PERMISSIONS.SETTINGS_VIEW', category: 'settings' },
  { key: 'settings.update', labelKey: 'PERMISSIONS.SETTINGS_UPDATE', category: 'settings' },
];

export const CATEGORY_ORDER: readonly { category: PermissionCategory; titleKey: string }[] = [
  { category: 'dashboard', titleKey: 'PERMISSIONS.CAT_DASHBOARD' },
  { category: 'properties', titleKey: 'PERMISSIONS.CAT_PROPERTIES' },
  { category: 'rooms', titleKey: 'PERMISSIONS.CAT_ROOMS' },
  { category: 'reservations', titleKey: 'PERMISSIONS.CAT_RESERVATIONS' },
  { category: 'guests', titleKey: 'PERMISSIONS.CAT_GUESTS' },
  { category: 'checkin', titleKey: 'PERMISSIONS.CAT_CHECKIN' },
  { category: 'staff', titleKey: 'PERMISSIONS.CAT_STAFF' },
  { category: 'housekeeping', titleKey: 'PERMISSIONS.CAT_HOUSEKEEPING' },
  { category: 'maintenance', titleKey: 'PERMISSIONS.CAT_MAINTENANCE' },
  { category: 'finance', titleKey: 'PERMISSIONS.CAT_FINANCE' },
  { category: 'reports', titleKey: 'PERMISSIONS.CAT_REPORTS' },
  { category: 'notifications', titleKey: 'PERMISSIONS.CAT_NOTIFICATIONS' },
  { category: 'settings', titleKey: 'PERMISSIONS.CAT_SETTINGS' },
];

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private readonly roleService = inject(RoleService);

  hasPermission(permission: PermissionKey): boolean {
    const profile = this.roleService.currentUserProfile();
    if (!profile) return false;

    // Owner role automatically has all permissions
    if (profile.role === 'owner') return true;

    // Check specific user permissions
    return profile.permissions?.includes(permission) ?? false;
  }

  hasAnyPermission(permissions: PermissionKey[]): boolean {
    if (permissions.length === 0) return true;
    return permissions.some((perm) => this.hasPermission(perm));
  }

  hasAllPermissions(permissions: PermissionKey[]): boolean {
    if (permissions.length === 0) return true;
    return permissions.every((perm) => this.hasPermission(perm));
  }

  getPermissionGroups(): PermissionGroup[] {
    return CATEGORY_ORDER.map(({ category, titleKey }) => ({
      category,
      titleKey,
      permissions: ALL_PERMISSIONS.filter((p) => p.category === category),
    }));
  }

  getDefaultPermissions(role: UserRole, designation?: string): PermissionKey[] {
    if (role === 'owner') {
      return ALL_PERMISSIONS.map((p) => p.key);
    }

    if (role === 'manager') {
      return [
        'dashboard.view',
        'property.view',
        'rooms.view',
        'rooms.create',
        'rooms.update',
        'rooms.view_assigned',
        'booking.view',
        'booking.create',
        'booking.update',
        'booking.cancel',
        'guest.view',
        'guest.create',
        'guest.update',
        'guest.checkin',
        'guest.checkout',
        'room.assign',
        'staff.view',
        'staff.assign_tasks',
        'housekeeping.view',
        'housekeeping.assign',
        'housekeeping.update_status',
        'housekeeping.inspect',
        'maintenance.view',
        'maintenance.create_request',
        'maintenance.assign',
        'maintenance.update_status',
        'finance.view',
        'finance.payment.collect',
        'finance.expenses.view',
        'finance.expenses.create',
        'reports.view',
        'notifications.view',
        'notifications.update',
        'settings.view',
      ];
    }

    // Role is 'staff' - determine defaults by designation
    const des = (designation || '').toLowerCase() as StaffDesignation;
    switch (des) {
      case 'housekeeping':
        return [
          'dashboard.view',
          'rooms.view_assigned',
          'housekeeping.view',
          'housekeeping.update_status',
          'maintenance.create_request',
          'notifications.view',
        ];
      case 'receptionist':
        return [
          'dashboard.view',
          'rooms.view',
          'rooms.view_assigned',
          'booking.view',
          'booking.create',
          'booking.update',
          'guest.view',
          'guest.create',
          'guest.update',
          'guest.checkin',
          'guest.checkout',
          'room.assign',
          'finance.payment.collect',
          'notifications.view',
        ];
      case 'maintenance':
        return [
          'dashboard.view',
          'rooms.view_assigned',
          'maintenance.view',
          'maintenance.create_request',
          'maintenance.update_status',
          'notifications.view',
        ];
      case 'guest_services':
        return [
          'dashboard.view',
          'booking.view',
          'guest.view',
          'guest.update',
          'notifications.view',
        ];
      case 'security':
        return [
          'dashboard.view',
          'guest.view',
          'notifications.view',
        ];
      case 'kitchen':
        return [
          'dashboard.view',
          'notifications.view',
        ];
      default:
        return [
          'dashboard.view',
          'rooms.view_assigned',
          'notifications.view',
        ];
    }
  }
}
