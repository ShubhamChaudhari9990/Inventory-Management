import { NAV_ITEMS } from '../../shared/data/nav-items';
import { NavItem } from '../../shared/models/nav-item.model';

export interface MoreMenuItem extends NavItem {
  destructive?: boolean;
}

/** More-screen staff icon keeps the existing More UI look. */
const MORE_ICON_OVERRIDES: Readonly<Record<string, string>> = {
  staff: 'person-outline',
};

const LOGOUT_ITEM: MoreMenuItem = {
  id: 'logout',
  label: 'NAV.LOGOUT',
  icon: 'log-out-outline',
  destructive: true,
};

/** More menu derived from NAV_ITEMS so labels/ids stay in sync with the sidebar. */
export const MORE_MENU_ITEMS: readonly MoreMenuItem[] = [
  ...NAV_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    icon: MORE_ICON_OVERRIDES[item.id] ?? item.icon,
  })),
  LOGOUT_ITEM,
];
