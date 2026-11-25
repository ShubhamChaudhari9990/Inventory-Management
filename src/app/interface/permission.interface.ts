export type PermissionKey =
  // Dashboard
  | 'dashboard.view'
  // Lodges / Properties
  | 'property.view'
  | 'property.create'
  | 'property.update'
  | 'property.delete'
  // Rooms
  | 'rooms.view'
  | 'rooms.create'
  | 'rooms.update'
  | 'rooms.delete'
  | 'rooms.view_assigned'
  // Reservations / Bookings
  | 'booking.view'
  | 'booking.create'
  | 'booking.update'
  | 'booking.cancel'
  // Guests
  | 'guest.view'
  | 'guest.create'
  | 'guest.update'
  // Check-in / Check-out
  | 'guest.checkin'
  | 'guest.checkout'
  | 'room.assign'
  // Staff
  | 'staff.view'
  | 'staff.create'
  | 'staff.update'
  | 'staff.delete'
  | 'staff.assign_tasks'
  // Housekeeping
  | 'housekeeping.view'
  | 'housekeeping.assign'
  | 'housekeeping.update_status'
  | 'housekeeping.inspect'
  // Maintenance
  | 'maintenance.view'
  | 'maintenance.create_request'
  | 'maintenance.assign'
  | 'maintenance.update_status'
  // Finance
  | 'finance.view'
  | 'finance.payment.collect'
  | 'finance.expenses.view'
  | 'finance.expenses.create'
  | 'finance.expenses.update'
  // Reports
  | 'reports.view'
  | 'reports.export'
  // Notifications
  | 'notifications.view'
  | 'notifications.update'
  // Settings
  | 'settings.view'
  | 'settings.update';

export type PermissionCategory =
  | 'dashboard'
  | 'properties'
  | 'rooms'
  | 'reservations'
  | 'guests'
  | 'checkin'
  | 'staff'
  | 'housekeeping'
  | 'maintenance'
  | 'finance'
  | 'reports'
  | 'notifications'
  | 'settings';

export interface PermissionDefinition {
  key: PermissionKey;
  labelKey: string;
  category: PermissionCategory;
  descriptionKey?: string;
}

export interface PermissionGroup {
  category: PermissionCategory;
  titleKey: string;
  permissions: PermissionDefinition[];
}
