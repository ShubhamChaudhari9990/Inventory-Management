import { UserRole } from './role.interface';
import { PermissionKey } from './permission.interface';

export type AppLanguage = 'en' | 'mr';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  badge?: string;
  roles?: UserRole[];
  permissions?: PermissionKey[];
}

export interface AppNotification {
  id: string;
  title?: string;
  titleKey?: string;
  description?: string;
  timeKey?: string;
  read?: boolean;
  propertyId?: string;
  type?: 'booking' | 'cleaning' | 'maintenance' | 'system';
}

export interface MoreMenuItem extends NavItem {
  destructive?: boolean;
  isDestructive?: boolean;
}
