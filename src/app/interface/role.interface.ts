export type UserRole = 'owner' | 'manager' | 'staff';

export interface RoleDefinition {
  id: UserRole;
  labelKey: string;
  descriptionKey: string;
  badgeTone: 'primary' | 'success' | 'warm';
}

export interface RoleOption {
  value: UserRole;
  labelKey: string;
}

export interface SettingsRole {
  id: string;
  titleKey: string;
  descKey: string;
  status: 'Active' | 'Inactive';
}
