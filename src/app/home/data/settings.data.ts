export interface SettingsRole {
  id: string;
  titleKey: string;
  descKey: string;
  status: 'Active';
}

export const SETTINGS_VIEW_SUBTITLE = 'BRAND.NAME';

export const SETTINGS_ROLES: readonly SettingsRole[] = [
  {
    id: 'super-admin',
    titleKey: 'SETTINGS.ROLE.SUPER_ADMIN',
    descKey: 'SETTINGS.ROLE.SUPER_ADMIN_DESC',
    status: 'Active',
  },
  {
    id: 'manager',
    titleKey: 'SETTINGS.ROLE.MANAGER',
    descKey: 'SETTINGS.ROLE.MANAGER_DESC',
    status: 'Active',
  },
  {
    id: 'reception',
    titleKey: 'SETTINGS.ROLE.RECEPTION',
    descKey: 'SETTINGS.ROLE.RECEPTION_DESC',
    status: 'Active',
  },
  {
    id: 'housekeeping',
    titleKey: 'SETTINGS.ROLE.HOUSEKEEPING',
    descKey: 'SETTINGS.ROLE.HOUSEKEEPING_DESC',
    status: 'Active',
  },
] as const;
